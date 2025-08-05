import Image from 'next/image'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { isPDFProduct, getProductDisplayImage, formatPageCount, PDFBadge, PDFPageIndicator, normalizeProductData } from '../utils/productUtils'
import { PDFPageIndicator as PDFPageIndicatorComponent, PDFBadge as PDFBadgeComponent } from './PDFViewer'

export default function ProductCard({ product, onProductClick }) {
  const { addToCart } = useCart()
  const [isAdding, setIsAdding] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  
  // Normalize product data to ensure consistent access to file information
  const normalizedProduct = normalizeProductData(product)
  
  // Product type detection
  const isPDF = isPDFProduct(normalizedProduct)
  const displayImage = getProductDisplayImage(normalizedProduct)
  const pageCount = normalizedProduct?.page_count || 0
  
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
    addToCart(normalizedProduct)
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      setIsAdding(false)
    }, 800)
  }

  const handleCardClick = (e) => {
    // Only trigger modal if onProductClick is provided and click wasn't on interactive elements
    if (onProductClick && !e.defaultPrevented) {
      onProductClick(normalizedProduct)
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
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
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
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ease-out ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            
            {/* Subtle overlay on hover */}
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

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
              className={`absolute w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white ${
                isPDF && pageCount > 0 ? 'top-12 right-3' : 'top-3 right-3'
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Add to favorites functionality
              }}
            >
              <svg className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Quick Add Button - Bottom */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="absolute bottom-3 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:bg-gray-800 disabled:opacity-50"
            >
              {isAdding ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Adding...</span>
                </div>
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
            
            {/* Price and Rating Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {/* Star Rating */}
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="text-xs text-gray-500 ml-1">(124)</span>
                </div>
              </div>
              
              {/* Price */}
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900">
                  ${normalizedProduct.price}
                </span>
              </div>
            </div>

            {/* Additional Details */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  Instant Download
                </span>
                {isPDF && (
                  <PDFPageIndicatorComponent 
                    pageCount={pageCount} 
                    className="text-gray-500 bg-red-50 px-2 py-1 rounded" 
                  />
                )}
              </div>
              <span className="text-xs text-gray-500">
                {Math.floor(Math.random() * 50) + 10} sold
              </span>
            </div>
          </div>
        </div>
    </div>
  )
}