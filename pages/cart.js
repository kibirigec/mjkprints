import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { useCart } from '../context/CartContext'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, getTotal, clearCart } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [email, setEmail] = useState('')
  const [showEmailForm, setShowEmailForm] = useState(false)

  const handleCheckout = async () => {
    if (!email || !email.includes('@')) {
      setShowEmailForm(true)
      return
    }

    setIsCheckingOut(true)
    
    try {
      // Create Stripe checkout session
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart,
          email: email,
          billingDetails: {
            email: email,
            name: 'Guest Customer'
          }
        }),
      })

      const { sessionId, error } = await response.json()

      if (response.ok && sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await stripePromise
        
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: sessionId,
        })

        if (stripeError) {
          console.error('Stripe redirect error:', stripeError)
          alert('Checkout failed. Please try again.')
        }
      } else {
        alert(error || 'Checkout failed. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Checkout failed. Please try again.')
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
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-primary mb-8">Shopping Cart</h1>

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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center space-x-6">
                      <div className="w-20 h-20 relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <Link href={`/product/${item.id}`}>
                          <h3 className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="text-primary font-semibold text-lg mt-2">
                          ${item.price}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl p-6 shadow-lg sticky top-8">
                  <h3 className="text-xl font-semibold text-primary mb-6">Order Summary</h3>
                  
                  <div className="space-y-3 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.title} × {item.quantity}
                        </span>
                        <span className="font-medium">
                          ${(item.price * item.quantity).toFixed(2)}
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
                  {(showEmailForm || email) && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Download links will be sent to this email address
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full btn-primary mb-4"
                  >
                    {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
                  </button>

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