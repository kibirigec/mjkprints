import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useCart } from '../context/CartContext'
import { generateShareableModalLink, copyUrlToClipboard } from '../utils/urlUtils'
import PDFViewer from './PDFViewer'
import { isPDFProduct, formatPageCount, normalizeProductData } from '../utils/productUtils'
import { getProductImage } from '../lib/supabase'

export default function CustomerPreviewModal({ product, isOpen, onClose }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [isLoading, setIsLoading] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const showWatermark = true // Always show watermark
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [viewMode, setViewMode] = useState('image') // 'image' or 'pdf'
  const [shareStatus, setShareStatus] = useState('') // For share feedback

  // Normalize product data to ensure consistent access to file information
  const normalizedProduct = normalizeProductData(product)

  // Product type detection - handle hybrid products with both PDF and image
  const hasUploadedImage = !!(normalizedProduct?.image_file_id)
  const hasPDF = isPDFProduct(normalizedProduct)
  const isHybrid = hasUploadedImage && hasPDF
  const displayImage = getProductImage(normalizedProduct)?.url || '/api/placeholder/800/600'
  const pageCount = normalizedProduct?.page_count || 0
  
  // Determine what to show based on view mode and available content
  const showPDF = hasPDF && (viewMode === 'pdf' || (!hasUploadedImage && hasPDF))
  const showImage = hasUploadedImage && (viewMode === 'image' || !hasPDF)

  // Close modal on escape key and anti-theft protection
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      // Allow escape to close modal
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Disable common screenshot/developer shortcuts
      const forbiddenKeys = [
        'F12', // Developer tools
        'PrintScreen', // Screenshot
        'F5', // Refresh (to prevent save page)
        'F11', // Fullscreen
      ]

      const forbiddenCombos = [
        (e.ctrlKey && e.shiftKey && e.key === 'I'), // Ctrl+Shift+I (DevTools)
        (e.ctrlKey && e.shiftKey && e.key === 'J'), // Ctrl+Shift+J (Console)
        (e.ctrlKey && e.shiftKey && e.key === 'C'), // Ctrl+Shift+C (Inspect)
        (e.ctrlKey && e.key === 'U'), // Ctrl+U (View source)
        (e.ctrlKey && e.key === 'S'), // Ctrl+S (Save)
        (e.ctrlKey && e.key === 'P'), // Ctrl+P (Print)
        (e.ctrlKey && e.key === 'A'), // Ctrl+A (Select all)
        (e.metaKey && e.key === 'S'), // Cmd+S (Save on Mac)
        (e.metaKey && e.key === 'P'), // Cmd+P (Print on Mac)
        (e.metaKey && e.key === 'A'), // Cmd+A (Select all on Mac)
      ]

      if (forbiddenKeys.includes(e.key) || forbiddenCombos.some(combo => combo)) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }

    const handleContextMenu = (e) => {
      e.preventDefault()
      return false
    }

    const handleDragStart = (e) => {
      e.preventDefault()
      return false
    }

    const handleSelectStart = (e) => {
      e.preventDefault()
      return false
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('dragstart', handleDragStart, true)
    document.addEventListener('selectstart', handleSelectStart, true)
    document.body.style.overflow = 'hidden'

    // Disable text selection on body while modal is open
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('dragstart', handleDragStart, true)
      document.removeEventListener('selectstart', handleSelectStart, true)
      document.body.style.overflow = 'unset'
      document.body.style.userSelect = 'auto'
      document.body.style.webkitUserSelect = 'auto'
    }
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Add to cart handler
  const handleAddToCart = async () => {
    setIsAddingToCart(true)
    addToCart(product)
    
    // Add visual feedback delay
    setTimeout(() => {
      setIsAddingToCart(false)
    }, 800)
  }

  // Share link handler
  const handleShareLink = async () => {
    try {
      const shareableUrl = generateShareableModalLink(normalizedProduct.id)
      const success = await copyUrlToClipboard(shareableUrl)
      
      if (success) {
        setShareStatus('✓ Link copied!')
        setTimeout(() => setShareStatus(''), 3000)
      } else {
        setShareStatus('✗ Copy failed')
        setTimeout(() => setShareStatus(''), 3000)
      }
    } catch (error) {
      console.error('Share failed:', error)
      setShareStatus('✗ Share failed')
      setTimeout(() => setShareStatus(''), 3000)
    }
  }

  // Buy now handler (adds to cart and redirects to checkout)
  const handleBuyNow = () => {
    setIsLoading(true)
    
    try {
      // Add item to cart
      addToCart(normalizedProduct, 1)
      
      // Close modal and redirect to cart with email form
      onClose()
      
      // Navigate to cart page with buy_now parameter to auto-show email form
      router.push('/cart?buy_now=true')
      
    } catch (error) {
      console.error('Add to cart error:', error)
      alert('Failed to add item to cart. Please try again.')
      setIsLoading(false)
    }
  }

  // Early return if modal is not open or no product provided
  if (!isOpen || !product) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary line-clamp-1">
                {normalizedProduct.title}
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-medium">${normalizedProduct.price}</span>
                {hasPDF && pageCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatPageCount(pageCount)}</span>
                  </>
                )}
                <span>•</span>
                <span className="text-green-600 font-medium">Instant Download</span>
              </div>
            </div>
          </div>

          {/* Share and Close Buttons */}
          <div className="flex items-center gap-3">
            {/* Share Button */}
            <div className="relative">
              <button
                onClick={handleShareLink}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                aria-label="Share product"
                title="Copy shareable link"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
              
              {/* Share Status Tooltip */}
              {shareStatus && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-3 py-1 rounded whitespace-nowrap z-50">
                  {shareStatus}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)]">
          {/* Preview Section */}
          <div className="flex-1 relative bg-gray-50">

            {/* Main Preview */}
            <div className="relative w-full h-full min-h-[400px] lg:min-h-[600px] p-6 preview-protection">
              {showPDF ? (
                <div className="relative w-full h-full">
                  <PDFViewer
                    product={normalizedProduct}
                    isZoomed={isZoomed}
                    onToggleZoom={() => setIsZoomed(!isZoomed)}
                    className="w-full h-full"
                  />
                  
                  {/* PDF Watermark Overlay */}
                  {showWatermark && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Multiple diagonal watermarks for better protection */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 text-gray-800/40 text-5xl font-bold rotate-12 select-none">
                          PREVIEW
                        </div>
                        <div className="absolute top-3/4 right-1/4 transform translate-x-1/2 translate-y-1/2 text-gray-800/40 text-5xl font-bold -rotate-12 select-none">
                          PREVIEW
                        </div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-800/30 text-6xl font-bold rotate-45 select-none">
                          MJK PRINTS
                        </div>
                      </div>
                      
                      {/* Grid pattern overlay */}
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 100px, rgba(0,0,0,0.1) 100px, rgba(0,0,0,0.1) 102px)',
                        backgroundSize: '141px 141px'
                      }} />
                      
                    </div>
                  )}
                </div>
              ) : showImage ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="relative max-w-full max-h-full">
                    <Image
                      src={displayImage}
                      alt={normalizedProduct.title}
                      width={800}
                      height={600}
                      className={`object-contain transition-transform duration-300 ${
                        isZoomed ? 'scale-110' : 'scale-100'
                      }`}
                      onClick={() => setIsZoomed(!isZoomed)}
                      style={{ cursor: 'zoom-in' }}
                    />
                    
                    {/* Image Watermark Overlay */}
                    {showWatermark && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Multiple creative watermark layers */}
                        <div className="absolute inset-0 opacity-25">
                          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 text-white/70 text-6xl font-bold rotate-12 select-none">
                            PREVIEW
                          </div>
                          <div className="absolute top-3/4 right-1/4 transform translate-x-1/2 translate-y-1/2 text-white/70 text-6xl font-bold -rotate-12 select-none">
                            PREVIEW
                          </div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/50 text-7xl font-bold rotate-45 select-none tracking-wider">
                            MJK PRINTS
                          </div>
                        </div>
                        
                        {/* Radial gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/20" />
                        
                        {/* Diagonal stripe pattern */}
                        <div className="absolute inset-0 opacity-15" style={{
                          backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 80px, rgba(255,255,255,0.3) 80px, rgba(255,255,255,0.3) 82px)',
                        }} />
                        
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No preview available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase Panel */}
          <div className="w-full lg:w-96 bg-white border-l border-gray-200">
            <div className="p-6 space-y-6">
              {/* Product Info */}
              <div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {normalizedProduct.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {normalizedProduct.description || 'High-quality digital artwork perfect for your creative projects. Instant download after purchase.'}
                </p>
              </div>

              {/* Features */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  What You Get
                </h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    High-resolution digital file
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Instant download after purchase
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Commercial use license
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Lifetime access to downloads
                  </li>
                  {isHybrid && (
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      Both preview image and PDF content included
                    </li>
                  )}
                  {hasPDF && pageCount > 0 && (
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                      {formatPageCount(pageCount)} in PDF format
                    </li>
                  )}
                </ul>
              </div>

              {/* Pricing */}
              <div className="text-center py-4 border-y border-gray-200">
                <div className="text-3xl font-bold text-primary">
                  ${normalizedProduct.price}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  One-time purchase • No subscription
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Buy Now Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Buy Now
                    </>
                  )}
                </button>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isAddingToCart ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
              </div>

              {/* Security Badges */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Secure Payment
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Instant Access
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-theft protection styles */}
      <style jsx>{`
        /* Comprehensive anti-theft protection */
        .preview-protection {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-drag: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          outline: none;
        }
        
        .preview-protection img {
          pointer-events: none;
          -webkit-user-drag: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
          object-fit: contain;
        }
        
        .preview-protection * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-user-drag: none !important;
        }
        
        /* Disable print for protection */
        @media print {
          .preview-protection {
            display: none !important;
          }
        }
        
        /* Disable F12 and inspect on preview area */
        .preview-protection {
          -webkit-app-region: no-drag;
        }
        
        /* Radial gradient utility */
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}