import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { normalizePreviewUrls, debugPreviewUrls } from '../utils/previewUtils'

export default function PDFViewer({ 
  product, 
  isZoomed = false, 
  onToggleZoom = null,
  className = '' 
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [previewUrls, setPreviewUrls] = useState([])
  const [error, setError] = useState(null)
  
  // Use ref to track if component is mounted and prevent race conditions
  const isMountedRef = useRef(true)
  const fetchControllerRef = useRef(null)

  // Extract PDF data from product
  const pdfFileId = product?.pdf_file_id
  const pageCount = product?.page_count || 0
  const previewPages = product?.preview_pages || 3
  const maxPreviewPage = Math.min(pageCount, previewPages)

  // Cleanup effect to handle component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      // Cancel any ongoing fetch request
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort()
      }
    }
  }, [])

  // Load preview URLs from product data
  useEffect(() => {
    // Reset state for new product
    setError(null)
    setIsLoading(true)
    
    // Cancel any ongoing fetch request when product changes
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort()
    }

    if (product?.file_info?.preview_urls) {
      // Use centralized utility for normalization
      const normalizedUrls = normalizePreviewUrls(product.file_info.preview_urls)
      debugPreviewUrls(product.file_info.preview_urls, 'PDFViewer')
      
      if (normalizedUrls.length > 0) {
        if (isMountedRef.current) {
          setPreviewUrls(normalizedUrls)
          setIsLoading(false)
        }
      } else if (pdfFileId) {
        // If normalization failed, try to fetch from API
        fetchPreviewUrls()
      } else {
        if (isMountedRef.current) {
          setError('No PDF preview available')
          setIsLoading(false)
        }
      }
    } else if (pdfFileId) {
      // If we have a PDF file ID but no preview URLs, try to fetch them
      fetchPreviewUrls()
    } else {
      if (isMountedRef.current) {
        setError('No PDF preview available')
        setIsLoading(false)
      }
    }
  }, [product, pdfFileId])

  const fetchPreviewUrls = async () => {
    try {
      // Create abort controller for this fetch
      fetchControllerRef.current = new AbortController()
      
      const response = await fetch(`/api/products/${product.id}/preview`, {
        signal: fetchControllerRef.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        if (data.preview_urls && Array.isArray(data.preview_urls)) {
          setPreviewUrls(data.preview_urls)
          setError(null)
        } else {
          setError('Preview images not available')
        }
      }
    } catch (err) {
      // Don't set error state if request was aborted (component unmounted)
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to fetch preview URLs:', err)
        setError('Failed to load preview images')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      fetchControllerRef.current = null
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1)
      } else if (event.key === 'ArrowRight' && currentPage < maxPreviewPage) {
        setCurrentPage(prev => prev + 1)
      } else if (event.key === ' ') {
        event.preventDefault()
        if (currentPage < maxPreviewPage) {
          setCurrentPage(prev => prev + 1)
        } else {
          setCurrentPage(1)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, maxPreviewPage])

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= maxPreviewPage) {
      setCurrentPage(page)
    }
  }, [maxPreviewPage])

  const nextPage = useCallback(() => {
    if (currentPage < maxPreviewPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, maxPreviewPage])

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const handleImageClick = () => {
    if (onToggleZoom) {
      onToggleZoom()
    }
  }

  // If not a PDF product, return null
  if (!pdfFileId || !pageCount) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading PDF preview...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center space-y-4 p-6 text-center">
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 font-medium">PDF Preview Unavailable</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const currentPreviewUrl = previewUrls[currentPage - 1]

  return (
    <div className={`relative w-full aspect-square bg-white rounded-xl overflow-hidden ${className}`}>
      {/* Header Bar with consolidated info */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF
        </div>
        <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
          {currentPage} / {pageCount}
        </div>
      </div>

      {/* Main PDF Page Display */}
      <div 
        className={`relative w-full h-full cursor-zoom-in transition-transform duration-300 ${
          isZoomed ? 'scale-105' : 'hover:scale-[1.02]'
        }`}
        onClick={handleImageClick}
      >
        {currentPreviewUrl ? (
          <Image
            src={currentPreviewUrl}
            alt={`${product.title} - Page ${currentPage}`}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 95vw, 60vw"
            priority={currentPage === 1}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">Page {currentPage}</p>
            </div>
          </div>
        )}

        {/* Copyright Protection Overlay */}
        <div className="absolute inset-0 bg-transparent pointer-events-none" 
          onContextMenu={(e) => e.preventDefault()} 
          onDragStart={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        />
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        {/* Preview Limit Notice */}
        {currentPage >= maxPreviewPage && maxPreviewPage < pageCount && (
          <div className="text-center mb-2">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              Preview: {maxPreviewPage} of {pageCount} pages
            </div>
          </div>
        )}

        {/* Zoom Indicator */}
        {onToggleZoom && (
          <div className="text-center mb-4">
            <div className="inline-block bg-black/70 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">
              Click to {isZoomed ? 'zoom out' : 'zoom in'}
            </div>
          </div>
        )}

        {/* Navigation Controls - Only show if multiple preview pages */}
        {maxPreviewPage > 1 && (
          <div className="bg-black/80 backdrop-blur-sm p-4 space-y-3">
            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={previousPage}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                aria-label="Previous page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="text-white text-sm font-medium px-3">
                Page {currentPage} of {maxPreviewPage}
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === maxPreviewPage}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-all"
                aria-label="Next page"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex justify-center">
              <div className="flex gap-2 overflow-x-auto max-w-full px-2">
                {Array.from({ length: maxPreviewPage }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`flex-shrink-0 w-12 h-16 rounded border-2 transition-all duration-200 ${
                      page === currentPage 
                        ? 'border-white shadow-lg ring-2 ring-white/50' 
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    title={`Go to page ${page}`}
                  >
                    {previewUrls[page - 1] ? (
                      <div className="relative w-full h-full rounded overflow-hidden">
                        <Image
                          src={previewUrls[page - 1]}
                          alt={`Page ${page}`}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs">{page}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        /* Disable right-click and text selection for copyright protection */
        .pdf-viewer {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-user-drag: none;
        }
        
        .pdf-viewer img {
          pointer-events: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </div>
  )
}

// Utility component for PDF page indicator in cards
export function PDFPageIndicator({ pageCount, className = '' }) {
  if (!pageCount || pageCount <= 1) return null

  return (
    <div className={`inline-flex items-center space-x-1 text-xs font-medium ${className}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>{pageCount} pages</span>
    </div>
  )
}

// Utility component for PDF badge
export function PDFBadge({ className = '' }) {
  return (
    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white ${className}`}>
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      PDF
    </div>
  )
}