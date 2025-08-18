import { useState, useEffect } from 'react'

const PDFPreviewComponent = ({ 
  pdfFile, 
  onProcessingComplete, 
  onProcessingError,
  className = '' 
}) => {
  const [processingStatus, setProcessingStatus] = useState('idle')
  const [processingProgress, setProcessingProgress] = useState(0)
  const [previewData, setPreviewData] = useState(null)
  const [error, setError] = useState(null)

  // Start processing when PDF file is provided
  useEffect(() => {
    if (pdfFile && processingStatus === 'idle') {
      startProcessing()
    }
  }, [pdfFile])

  // Start PDF processing
  const startProcessing = async () => {
    if (!pdfFile?.id) return

    setProcessingStatus('processing')
    setProcessingProgress(10) // Start with small progress to show activity
    setError(null)

    try {
      
      // Show progress steps instead of artificial simulation
      setProcessingProgress(25) // Initiating processing
      
      const response = await fetch('/api/process/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: pdfFile.id }),
      })

      setProcessingProgress(75) // API call completed

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[PDF-PREVIEW] Processing API error:', errorData)
        throw new Error(errorData.error || errorData.details || 'Processing failed')
      }

      const data = await response.json()
      
      if (data.success && data.file) {
        setProcessingProgress(100)
        setProcessingStatus('completed')
        setPreviewData(data.file)
        
        if (onProcessingComplete) {
          onProcessingComplete(data.file)
        }
      } else {
        throw new Error(data.message || 'Processing failed - no file data returned')
      }
    } catch (error) {
      console.error('[PDF-PREVIEW] Processing error:', error)
      const errorMessage = error.message || 'Processing failed'
      setError(errorMessage)
      setProcessingStatus('failed')
      setProcessingProgress(0) // Reset progress on failure
      
      if (onProcessingError) {
        onProcessingError(errorMessage)
      }
    }
  }

  // Retry processing
  const retryProcessing = () => {
    setProcessingStatus('idle')
    setError(null)
    startProcessing()
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Format dimensions
  const formatDimensions = (dimensions) => {
    if (!dimensions) return 'Unknown'
    return `${Math.round(dimensions.width)} × ${Math.round(dimensions.height)} px`
  }

  // Get thumbnail URL from Supabase storage
  const getThumbnailUrl = (storagePath) => {
    if (!storagePath) {
      console.warn('[PDF-PREVIEW] No storage path provided for thumbnail')
      return null
    }
    
    // Get Supabase URL from environment - handle both server and client side
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!supabaseUrl) {
      console.error('[PDF-PREVIEW] NEXT_PUBLIC_SUPABASE_URL not configured in environment variables')
      return null
    }
    
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${storagePath}`
    
    return fullUrl
  }

  // Render processing state
  const renderProcessingState = () => {
    switch (processingStatus) {
      case 'processing':
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              {/* Processing animation */}
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 border-4 border-info/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-info border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-primary">Processing PDF</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generating previews and extracting metadata...
                </p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-info h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{processingProgress}% complete</p>
              </div>
            </div>
          </div>
        )

      case 'failed':
        return (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              {/* Error icon */}
              <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-error">Processing Failed</h3>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
                <button
                  onClick={retryProcessing}
                  className="mt-3 btn-secondary text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!pdfFile) {
    return null
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-primary truncate">
              {pdfFile.fileName || 'Untitled.pdf'}
            </h3>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>{formatFileSize(pdfFile.fileSize)}</span>
              {pdfFile.pageCount && (
                <span>{pdfFile.pageCount} page{pdfFile.pageCount !== 1 ? 's' : ''}</span>
              )}
              {previewData?.dimensions && (
                <span>{formatDimensions(previewData.dimensions)}</span>
              )}
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex-shrink-0 ml-4">
            {processingStatus === 'completed' && (
              <div className="flex items-center text-success">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Ready</span>
              </div>
            )}
            {processingStatus === 'processing' && (
              <div className="flex items-center text-info">
                <div className="w-4 h-4 mr-1 border-2 border-info border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Processing</span>
              </div>
            )}
            {processingStatus === 'failed' && (
              <div className="flex items-center text-error">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm">Failed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {processingStatus === 'completed' && previewData ? (
          <div className="space-y-6">
            {/* Preview thumbnails */}
            {previewData.thumbnailUrls?.pages && previewData.thumbnailUrls.pages.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Page Previews
                  </h4>
                  <span className="text-xs text-gray-500">
                    {previewData.thumbnailUrls.pages.length} pages generated
                  </span>
                </div>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {previewData.thumbnailUrls.pages.map((thumbnail, index) => {
                    const thumbnailUrl = getThumbnailUrl(thumbnail.url)
                    
                    return (
                      <div
                        key={`thumbnail-${thumbnail.page}-${index}`}
                        className="group relative aspect-[3/4] bg-white rounded-lg border-2 border-gray-200 hover:border-primary/30 transition-colors overflow-hidden"
                      >
                        <div className="absolute top-1 left-1 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-medium z-10">
                          {thumbnail.page}
                        </div>
                        
                        {thumbnailUrl ? (
                          <>
                            {/* Loading placeholder */}
                            <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            
                            {/* Actual image */}
                            <img
                              src={thumbnailUrl}
                              alt={`Page ${thumbnail.page}`}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onLoad={(e) => {
                                e.target.previousElementSibling.style.display = 'none'
                              }}
                              onError={(e) => {
                                console.warn('[PDF-PREVIEW] Image failed to load:', e.target.src)
                                e.target.style.display = 'none'
                                e.target.previousElementSibling.style.display = 'none'
                                e.target.nextElementSibling.style.display = 'flex'
                              }}
                            />
                            
                            {/* Error fallback */}
                            <div className="absolute inset-0 bg-red-50 border-2 border-red-200 rounded items-center justify-center hidden flex-col">
                              <svg className="w-6 h-6 text-red-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-xs text-red-600 font-medium">Failed</span>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 bg-yellow-50 border-2 border-yellow-200 rounded items-center justify-center flex flex-col">
                            <svg className="w-6 h-6 text-yellow-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-xs text-yellow-700 font-medium">No URL</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            
            {/* Show when no thumbnails are available */}
            {(!previewData.thumbnailUrls?.pages || previewData.thumbnailUrls.pages.length === 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-800 font-medium text-sm">Preview Available</p>
                    <p className="text-blue-700 text-xs mt-1">
                      PDF processed successfully. Preview images will appear once fully loaded.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            {previewData.metadata && Object.keys(previewData.metadata).some(key => previewData.metadata[key]) && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Document Information
                </h4>
                
                <div className="space-y-3">
                  {previewData.metadata.title && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide min-w-0 sm:min-w-[80px]">Title</span>
                      <span className="text-sm text-primary font-medium break-words">{previewData.metadata.title}</span>
                    </div>
                  )}
                  {previewData.metadata.author && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide min-w-0 sm:min-w-[80px]">Author</span>
                      <span className="text-sm text-primary break-words">{previewData.metadata.author}</span>
                    </div>
                  )}
                  {previewData.metadata.creator && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide min-w-0 sm:min-w-[80px]">Creator</span>
                      <span className="text-sm text-primary break-words">{previewData.metadata.creator}</span>
                    </div>
                  )}
                  {previewData.metadata.creationDate && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide min-w-0 sm:min-w-[80px]">Created</span>
                      <span className="text-sm text-primary">
                        {new Date(previewData.metadata.creationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Processing info */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Processing Complete</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      PDF validated and processed successfully
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Preview images generated and stored
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Ready to create product listing
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          renderProcessingState()
        )}
      </div>
    </div>
  )
}

export default PDFPreviewComponent