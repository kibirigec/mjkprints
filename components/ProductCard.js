import Image from 'next/image'
import { useState, useMemo, memo } from 'react'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { isPDFProduct, formatPageCount, PDFBadge, PDFPageIndicator, normalizeProductData, getProductSoldCount } from '../utils/productUtils'
import { getProductImage } from '../lib/supabase'
import { PDFPageIndicator as PDFPageIndicatorComponent, PDFBadge as PDFBadgeComponent } from './PDFViewer'

function ProductCard({ product, onProductClick, isPriority = false, showNewBadge = false }) {
  const { addToCart } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const [isAdding, setIsAdding] = useState(false)
  const [alreadyInCart, setAlreadyInCart] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  
  // Normalize product data to ensure consistent access to file information
  const normalizedProduct = normalizeProductData(product)
  
  // Memoize expensive calculations to prevent unnecessary recalculations
  const { isPDF, displayImage, pageCount } = useMemo(() => {
    if (!product) {
      return {
        isPDF: false,
        displayImage: '/api/placeholder/400/400',
        pageCount: 0
      }
    }
    return {
      isPDF: isPDFProduct(normalizedProduct),
      displayImage: getProductImage(normalizedProduct)?.url || '/api/placeholder/400/400',
      pageCount: normalizedProduct?.page_count || 0
    }
  }, [product, normalizedProduct])
  
  // Early return if no product provided - after hooks
  if (!product) {
    return null
  }
  
  // Fallback image for when display image fails to load
  const fallbackImage = '/api/placeholder/400/400'

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsAdding(true)
    const wasAdded = addToCart(normalizedProduct)
    
    if (!wasAdded) {
      setAlreadyInCart(true)
    }
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      setIsAdding(false)
      setAlreadyInCart(false)
    }, wasAdded ? 800 : 1200) // Show "already in cart" longer
  }

  const handleCardClick = (e) => {
    // Only trigger modal if onProductClick is provided and click wasn't on interactive elements
    if (onProductClick && !e.defaultPrevented) {
      onProductClick(normalizedProduct)
    }
  }

  const handleToggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsTogglingFavorite(true)
    
    try {
      const wasAdded = toggleFavorite(normalizedProduct)
      console.log(`❤️ ${wasAdded ? 'Added to' : 'Removed from'} favorites:`, normalizedProduct.title)
      
      // Small delay for visual feedback
      setTimeout(() => {
        setIsTogglingFavorite(false)
      }, 300)
    } catch (error) {
      console.error('Error toggling favorite:', error)
      setIsTogglingFavorite(false)
    }
  }

  return (
    <div 
      className="group cursor-pointer"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick(e)
        }
      }}
      aria-label={`View details for ${normalizedProduct.title}`}
    >
      {/* Etsy-style clean card */}
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md overflow-hidden transition-shadow duration-200">
          {/* Image Container - Etsy Style */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {/* Loading state */}
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Error state */}
            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs text-center px-2">Image unavailable</span>
              </div>
            )}
            
            <Image
              src={imageError ? fallbackImage : displayImage}
              alt={normalizedProduct.title}
              fill
              priority={isPriority}
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ease-out ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Subtle overlay on hover - GPU accelerated */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 will-change-[opacity]" />

            {/* PDF Badge - Top Left */}
            {isPDF && (
              <div className="absolute top-3 left-3">
                <PDFBadgeComponent />
              </div>
            )}

            {/* Page Count - Top Right for PDFs */}
            {isPDF && pageCount > 0 && (
              <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur-sm">
                {formatPageCount(pageCount)}
              </div>
            )}


            {/* Favorite/Heart Icon - Positioned to avoid conflicts */}
            <button 
              className={`absolute w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white will-change-[opacity] ${
                isPDF && pageCount > 0 
                  ? 'top-12 right-3' 
                  : 'top-3 right-3'
              } ${isFavorite(normalizedProduct.id) ? 'opacity-100' : ''}`}
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              title={isFavorite(normalizedProduct.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isTogglingFavorite ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg 
                  className={`w-4 h-4 transition-colors ${
                    isFavorite(normalizedProduct.id) 
                      ? 'text-red-500 fill-current' 
                      : 'text-gray-600 hover:text-red-500'
                  }`} 
                  fill={isFavorite(normalizedProduct.id) ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
            </button>

            {/* Quick Add Button - Bottom Center */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="absolute bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white px-4 py-2 rounded-full text-sm font-medium transition-opacity duration-200 hover:bg-gray-800 disabled:opacity-50 will-change-[opacity]"
            >
              {isAdding ? (
                alreadyInCart ? (
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Already in cart</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </div>
                )
              ) : (
                "Quick add"
              )}
            </button>
          </div>

          {/* Product Info - Etsy Style */}
          <div className="p-3">
            {/* Title */}
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 leading-tight group-hover:text-primary transition-colors duration-200">
              {normalizedProduct.title}
            </h3>
            
            {/* Artist/Shop Name */}
            <p className="text-xs text-gray-500 mb-2">
              Digital Artist
            </p>
            
            {/* Price */}
            <div className="mb-2">
              <span className="text-lg font-semibold text-gray-900">
                ${normalizedProduct.price}
              </span>
            </div>

            {/* Additional Details */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  Instant Download
                </span>
                {showNewBadge && (
                  <span className="text-xs text-amber-800 bg-amber-100 px-2 py-1 rounded">
                    NEW
                  </span>
                )}
                {isPDF && (
                  <PDFPageIndicatorComponent 
                    pageCount={pageCount} 
                    className="text-gray-500 bg-red-50 px-2 py-1 rounded" 
                  />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {getProductSoldCount(normalizedProduct)}
              </span>
            </div>
          </div>
        </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(ProductCard)