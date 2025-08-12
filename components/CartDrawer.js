import { useCart } from '../context/CartContext'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { getProductImage } from '../lib/supabase'

export default function CartDrawer({ isOpen, onClose }) {
  const { cart, updateQuantity, removeFromCart, getTotal } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const router = useRouter()

  const handleCheckout = async () => {
    console.log('🛒 CartDrawer: Starting checkout redirect...', { cartItems: cart.length })
    setIsCheckingOut(true)
    
    try {
      // Close the drawer first
      onClose()
      
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Redirect to cart page for full checkout experience
      await router.push('/cart')
      
      console.log('✅ CartDrawer: Successfully redirected to cart page')
    } catch (error) {
      console.error('❌ CartDrawer: Redirect failed:', error)
      alert('Unable to proceed to checkout. Please try again.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-accent-dark border-b border-gray-300 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.8 7h9.6" />
                </svg>
                <h2 className="text-lg font-medium text-primary">
                  Cart ({cart.length})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-16 px-6">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.8 7h9.6" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                <p className="text-gray-500 text-sm">Add some digital prints to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex space-x-3">
                      <div className="w-20 h-20 relative bg-gray-100 flex-shrink-0">
                        <Image
                          src={getProductImage(item, 'small')?.url || item.image || '/api/placeholder/200/200'}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/200/200'
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          {item.title}
                        </h3>
                        <div className="text-sm text-green-600 mb-2">
                          ✓ Instant download
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-gray-900">
                            ${item.price}
                          </div>
                          
                          {/* Digital download indicator */}
                          <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            1× Digital Download
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-info hover:underline"
                          >
                            Delete
                          </button>
                          <button className="text-info hover:underline">
                            Save for later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-gray-300 bg-accent-dark p-4">
              {/* Subtotal */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-medium">
                  Subtotal ({cart.length} {cart.length === 1 ? 'product' : 'products'}):
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ${getTotal().toFixed(2)}
                </span>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-secondary hover:bg-secondary-dark text-primary font-medium py-2 px-4 rounded text-sm transition-colors shadow-sm"
                >
                  {isCheckingOut ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Going to checkout...</span>
                    </div>
                  ) : (
                    'Go to Checkout'
                  )}
                </button>
                
                <div className="text-center">
                  <button 
                    onClick={onClose}
                    className="text-info text-sm hover:underline"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-600">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span>Secure 256-bit SSL encryption</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}