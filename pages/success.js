import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function SuccessPage() {
  const router = useRouter()
  const { session_id, order_id } = router.query
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState(null)

  useEffect(() => {
    if (order_id) {
      fetchOrderDetails()
    }
  }, [order_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOrderDetails = async () => {
    try {
      const response = await fetch(`/api/orders?orderId=${order_id}`)
      
      if (response.ok) {
        const orderData = await response.json()
        setOrder(orderData)
      } else {
        setError('Failed to load order details')
      }
    } catch (err) {
      setError('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const resendEmail = async () => {
    if (!order_id) {
      setEmailResult({ success: false, message: 'No order ID available' })
      return
    }

    setEmailSending(true)
    setEmailResult(null)

    try {
      const response = await fetch(`/api/orders/${order_id}/resend-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (result.success) {
        setEmailResult({
          success: true,
          message: 'Email sent successfully! Check your inbox.',
          details: result.details
        })
      } else {
        setEmailResult({
          success: false,
          message: result.error || 'Failed to send email',
          details: result.details
        })
      }
    } catch (error) {
      setEmailResult({
        success: false,
        message: 'Failed to send email. Please try again.',
        details: error.message
      })
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <>
      <Head>
        <title>Order Successful - MJK Prints</title>
        <meta name="description" content="Your order has been completed successfully!" />
      </Head>

      <div className="min-h-screen bg-accent">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {loading ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading order details...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-primary mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-8">{error}</p>
              <Link href="/" className="btn-primary">
                Return to Gallery
              </Link>
            </div>
          ) : (
            <div className="text-center">
              {/* Success Animation */}
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-4xl font-bold text-primary mb-4 animate-fade-in-up">
                Order Successful! 🎉
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 animate-fade-in-up delay-300">
                Thank you for your purchase! Your digital artwork is ready to download.
              </p>

              {order && (
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 animate-fade-in-up delay-500">
                  <div className="border-b border-gray-200 pb-6 mb-6">
                    <h2 className="text-2xl font-semibold text-primary mb-2">Order Details</h2>
                    <p className="text-gray-600">Order ID: <span className="font-mono text-sm">{order.id}</span></p>
                    <p className="text-gray-600">Email: {order.email}</p>
                    <p className="text-gray-600">Total: <span className="font-semibold">${order.total_amount}</span></p>
                  </div>

                  {order.order_items && order.order_items.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary">Your Digital Downloads</h3>
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-primary">
                              {item.products?.title || 'Digital Artwork'}
                            </h4>
                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                            <p className="text-sm font-semibold">${item.total_price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Email Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8 animate-fade-in-up delay-700">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-blue-800">Check Your Email</h3>
                </div>
                <p className="text-blue-700 mb-4">
                  Download links have been sent to your email address. 
                  Links will remain active for 7 days.
                </p>
                
                {/* Resend Email Button */}
                <div className="border-t border-blue-200 pt-4">
                  <p className="text-sm text-blue-600 mb-3">
                    Didn't receive the email? You can resend it here:
                  </p>
                  <button
                    onClick={resendEmail}
                    disabled={emailSending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center space-x-2 mx-auto"
                  >
                    {emailSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Resend Email</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Email Result */}
                {emailResult && (
                  <div className={`mt-4 p-3 rounded-lg text-sm ${
                    emailResult.success 
                      ? 'bg-green-100 border border-green-200 text-green-800' 
                      : 'bg-red-100 border border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {emailResult.success ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className="font-medium">{emailResult.message}</span>
                    </div>
                    {emailResult.details && (
                      <div className="mt-2 text-xs opacity-75">
                        {typeof emailResult.details === 'object' ? 
                          `Sent to: ${emailResult.details.recipient || 'Unknown'}` : 
                          emailResult.details
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-1000">
                <Link href="/" className="btn-primary">
                  Continue Shopping
                </Link>
                <Link href="/downloads" className="btn-secondary">
                  View My Downloads
                </Link>
              </div>

              {/* Support Notice */}
              <p className="text-sm text-gray-500 mt-8">
                Having trouble? Contact our support team at support@mjkprints.com
              </p>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}