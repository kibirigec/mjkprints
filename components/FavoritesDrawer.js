import { useFavorites } from '../context/FavoritesContext'
import { useCart } from '../context/CartContext'
import Image from 'next/image'
import { useState } from 'react'
import { getProductImage } from '../lib/supabase'

export default function FavoritesDrawer({ isOpen, onClose }) {
  const { favorites, removeFromFavorites } = useFavorites()
  const { addToCart, isInCart } = useCart()
  const [addingToCart, setAddingToCart] = useState({})

  const handleAddToCart = async (product, e) => {
    e.preventDefault()
    e.stopPropagation()
    
    setAddingToCart(prev => ({ ...prev, [product.id]: true }))
    
    try {
      const wasAdded = addToCart(product)
      
      // Show feedback for a moment
      setTimeout(() => {
        setAddingToCart(prev => ({ ...prev, [product.id]: false }))
      }, wasAdded ? 800 : 1200)
    } catch (error) {
      console.error('Error adding to cart:', error)
      setAddingToCart(prev => ({ ...prev, [product.id]: false }))
    }
  }

  const handleProductClick = (product) => {
    // Close drawer and potentially show product modal
    onClose()
    // You could add product modal logic here if needed
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
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <h2 className="text-lg font-medium text-primary">
                  Favorites ({favorites.length})
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
            {favorites.length === 0 ? (
              <div className="text-center py-16 px-6">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                <p className="text-gray-500 text-sm">Start adding digital prints you love</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {favorites.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex space-x-3">
                      <div 
                        className="w-20 h-20 relative bg-gray-100 flex-shrink-0 cursor-pointer"
                        onClick={() => handleProductClick(item)}
                      >
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
                        <h3 
                          className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleProductClick(item)}
                        >
                          {item.title}
                        </h3>
                        <div className="text-lg font-bold text-gray-900 mb-2">
                          ${item.price}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Add to Cart Button */}
                          {isInCart(item.id) ? (
                            <button className="flex-1 bg-gray-100 text-gray-600 px-3 py-2 rounded text-xs font-medium cursor-not-allowed">
                              ✓ In Cart
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleAddToCart(item, e)}
                              disabled={addingToCart[item.id]}
                              className="flex-1 bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {addingToCart[item.id] ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Adding...</span>
                                </div>
                              ) : (
                                'Add to Cart'
                              )}
                            </button>
                          )}
                          
                          {/* Remove from Favorites */}
                          <button
                            onClick={() => removeFromFavorites(item.id)}
                            className="p-2 text-red-500 hover:text-red-700 transition-colors"
                            title="Remove from favorites"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {favorites.length > 0 && (
            <div className="border-t border-gray-300 bg-accent-dark p-4">
              <div className="text-center">
                <button 
                  onClick={onClose}
                  className="text-info text-sm hover:underline"
                >
                  Continue browsing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}