import { useState, useEffect } from 'react'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'
import { getProductImage } from '../lib/supabase'

export default function CartPage() {
  const router = useRouter()
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [paypalLoading, setPaypalLoading] = useState(true) // Start as loading
  const [paypalError, setPaypalError] = useState(null)
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  // Auto-show email form when coming from "Buy Now"
  useEffect(() => {
    if (router.query.buy_now === 'true') {
      setShowEmailForm(true)
    }
  }, [router.query.buy_now])

  // Email validation function
  const validateEmail = (emailValue) => {
    if (!emailValue) {
      return 'Email is required'
    }
    if (!emailValue.includes('@') || !emailValue.includes('.') || emailValue.length < 5) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  // Handle email change with validation
  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    const error = validateEmail(value)
    setEmailError(error)
  }

  const handlePayPalCreateOrder = async () => {
    console.log('🛒 Starting PayPal order creation...', { 
      email, 
      cartItems: cart.length,
      timestamp: new Date().toISOString(),
      caller: 'PayPal SDK Button'
    })
    
    // Validate email
    const emailValidationError = validateEmail(email)
    if (emailValidationError) {
      console.log('❌ Email validation failed:', email)
      setEmailError(emailValidationError)
      throw new Error(emailValidationError)
    }

    try {
      console.log('📡 Creating PayPal checkout session...')
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity || 1),
            description: item.description || 'Digital Download'
          })),
          email: email,
          billingDetails: {
            email: email,
            name: 'Guest Customer'
          }
        }),
      })

      console.log('📡 Checkout API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API request failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText,
          url: response.url
        })
        throw new Error(`API request failed with status ${response.status}: ${errorText}`)
      }

      const responseData = await response.json()
      console.log('📡 Checkout API response data:', responseData)
      
      const { paypalOrderId, error } = responseData

      if (paypalOrderId) {
        console.log('🏪 PayPal order created successfully:', paypalOrderId)
        return paypalOrderId
      } else {
        console.error('❌ PayPal order creation failed:', error)
        throw new Error(error || 'Failed to create PayPal order')
      }
    } catch (error) {
      console.error('❌ PayPal order creation error:', error)
      throw new Error(error.message || 'Failed to create PayPal order')
    }
  }

  const handlePayPalApprove = async (data, actions) => {
    console.log('💰 PayPal payment approved:', data.orderID)
    setIsCheckingOut(true)
    
    try {
      // Capture the payment
      const details = await actions.order.capture()
      console.log('💳 PayPal payment captured:', details)
      
      // Find the order ID from our database
      const orderId = details.purchase_units?.[0]?.reference_id
      
      if (orderId) {
        console.log('✅ Payment successful, redirecting to success page')
        // Clear the cart and redirect to success page
        clearCart()
        router.push(`/success?paypal_order_id=${data.orderID}&order_id=${orderId}`)
      } else {
        throw new Error('Order ID not found in payment details')
      }
    } catch (error) {
      console.error('❌ Error processing payment approval:', error)
      alert(`Payment processing failed: ${error.message || 'Please contact support.'}`)
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handlePayPalError = (error) => {
    console.error('❌ PayPal payment error:', error)
    setPaypalError(error.message || 'PayPal payment failed')
    alert(`Payment failed: ${error.message || 'Please try again.'}`)
    setIsCheckingOut(false)
  }

  // Fallback checkout function for when PayPal fails
  const handleFallbackCheckout = async () => {
    // Validate email
    const emailValidationError = validateEmail(email)
    if (emailValidationError) {
      setEmailError(emailValidationError)
      return
    }

    setIsCheckingOut(true)
    
    try {
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: parseFloat(item.price),
            quantity: parseInt(item.quantity || 1),
            description: item.description || 'Digital Download'
          })),
          email: email,
          billingDetails: {
            email: email,
            name: 'Guest Customer'
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const responseData = await response.json()
      const { approvalUrl, paypalOrderId } = responseData

      if (approvalUrl) {
        // Redirect to PayPal approval URL
        window.location.href = approvalUrl
      } else {
        throw new Error('PayPal approval URL not found')
      }
    } catch (error) {
      console.error('❌ Fallback checkout error:', error)
      alert(`Checkout failed: ${error.message || 'Please try again.'}`)
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <>
      <Head>
        <title>Shopping Cart - MJK Prints</title>
        <meta name="description" content="Review your selected digital prints before checkout" />
      </Head>

      <div className="min-h-screen bg-accent">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8">Shopping Cart</h1>

          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.8 7h9.6" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-primary mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">Discover amazing digital prints from our talented artists.</p>
              <Link href="/" className="btn-primary">
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 sm:p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Mobile: Image and content row */}
                      <div className="flex items-start space-x-4 w-full sm:w-auto sm:flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={getProductImage(item, 'medium')?.url || item.image || '/api/placeholder/300/300'}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 64px, 80px"
                            onError={(e) => {
                              e.target.src = '/api/placeholder/300/300'
                            }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <Link href={`/product/${item.id}`}>
                            <h3 className="text-base sm:text-lg font-semibold text-primary hover:text-primary/80 transition-colors line-clamp-2">
                              {item.title}
                            </h3>
                          </Link>
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2 hidden sm:block">
                            {item.description}
                          </p>
                          <p className="text-primary font-semibold text-lg mt-1 sm:mt-2">
                            ${item.price}
                          </p>
                        </div>
                      </div>

                      {/* Mobile: Indicators and button row */}
                      <div className="flex items-center justify-between w-full sm:w-auto sm:flex-shrink-0 sm:space-x-3">
                        {/* Digital download indicator */}
                        <div className="text-xs sm:text-sm text-gray-500 bg-gray-50 px-2 sm:px-3 py-1 rounded-lg">
                          1× Digital Download
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          aria-label="Remove from cart"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg lg:sticky lg:top-8">
                  <h3 className="text-xl font-semibold text-primary mb-6">Order Summary</h3>
                  
                  <div className="space-y-3 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-sm gap-3">
                        <span className="text-gray-600 line-clamp-2 flex-1">
                          {item.title}
                        </span>
                        <span className="font-medium text-primary flex-shrink-0">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total:</span>
                      <span className="text-primary">${getTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Email Collection Form */}
                  <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="your@email.com"
                      className={`w-full px-3 py-3 text-base border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                        emailError 
                          ? 'border-red-300 focus:ring-red-200 focus:border-red-500' 
                          : email && !emailError
                            ? 'border-green-300 focus:ring-green-200 focus:border-green-500'
                            : 'border-gray-300 focus:ring-secondary focus:border-transparent'
                      }`}
                      required
                    />
                    {emailError && (
                      <p className="text-xs text-red-600 mt-1">
                        {emailError}
                      </p>
                    )}
                    {!emailError && email && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Valid email address
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Download links will be sent to this email address
                    </p>
                  </div>

                  {/* PayPal Buttons */}
                  <div className="mb-4">
                    {email && !emailError ? (
                      <div>
                        <PayPalScriptProvider 
                          options={{ 
                            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "AR9qsXbxX30I23erwoc6AoScM-GU8xE8B0vr8UsIwc4IDz1kbzE2Fq_28fJJrUut85g199Z5oLxkaKzT",
                            currency: "USD",
                            intent: "capture",
                            "enable-funding": "venmo,paylater,card",
                            "disable-funding": "",
                            locale: "en_US"
                          }}
                          onLoadStart={() => {
                            console.log('PayPal script loading started')
                            setPaypalLoading(true)
                            setPaypalLoaded(false)
                            setPaypalError(null)
                          }}
                          onLoad={() => {
                            console.log('PayPal script loaded successfully')
                            setPaypalLoading(false)
                            setPaypalLoaded(true)
                            setPaypalError(null)
                          }}
                          onError={(error) => {
                            console.error('PayPal script loading error:', error)
                            setPaypalError('PayPal failed to load')
                            setPaypalLoading(false)
                            setPaypalLoaded(false)
                          }}
                        >
                          <PayPalButtons
                            disabled={isCheckingOut || !!emailError || !email}
                            style={{
                              layout: "vertical",
                              color: "blue",
                              shape: "rect",
                              label: "pay"
                            }}
                            createOrder={handlePayPalCreateOrder}
                            onApprove={handlePayPalApprove}
                            onError={handlePayPalError}
                            onCancel={() => {
                              console.log('PayPal payment cancelled')
                              setIsCheckingOut(false)
                            }}
                          />
                        </PayPalScriptProvider>
                        
                        {/* Always show fallback button with PayPal branding */}
                        <div className="mt-4 space-y-3">
                          {paypalLoading && !paypalLoaded && (
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-blue-700">Loading PayPal buttons...</span>
                              </div>
                            </div>
                          )}
                          
                          {paypalError && (
                            <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-yellow-800 text-sm">
                                PayPal buttons couldn't load. Use the checkout button below.
                              </p>
                            </div>
                          )}
                          
                          {/* Always show fallback button */}
                          <div className="space-y-2">
                            <button
                              onClick={handleFallbackCheckout}
                              disabled={isCheckingOut || !!emailError || !email}
                              className={`w-full px-6 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-3 ${
                                isCheckingOut || !!emailError || !email
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                              }`}
                            >
                              {isCheckingOut ? (
                                <div className="flex items-center justify-center space-x-2">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Processing...</span>
                                </div>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h8.418c2.508 0 4.556.19 5.974 1.146 1.344.916 2.182 2.343 2.182 4.583 0 2.334-.989 4.282-2.398 5.391-1.83 1.441-4.474 1.68-7.207 1.68H9.185l-1.23 8.537zm2.984-13.014h2.602c1.185 0 2.154-.182 2.754-.516.6-.334.9-.86.9-1.578 0-.718-.3-1.244-.9-1.578-.6-.334-1.569-.516-2.754-.516H9.06l1z"/>
                                  </svg>
                                  <span>Continue with PayPal</span>
                                </>
                              )}
                            </button>
                            <p className="text-xs text-center text-gray-500">
                              Secure checkout powered by PayPal
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <p className="text-sm text-gray-600">
                          Please enter your email address to continue with PayPal checkout
                        </p>
                      </div>
                    )}
                  </div>

                  <Link href="/" className="block text-center text-secondary hover:text-secondary/80 transition-colors">
                    Continue Shopping
                  </Link>

                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Instant download after purchase</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Secure checkout process</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}