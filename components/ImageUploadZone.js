import React, { useState, useCallback, useRef } from 'react'

/**
 * ImageUploadZone Component
 * 
 * A drag & drop image upload component with preview, progress tracking, and validation.
 * Supports JPG, PNG, WebP, and GIF formats with a 10MB size limit.
 * 
 * Props:
 * @param {function} onUploadComplete - Callback when upload succeeds (file) => {}
 * @param {function} onUploadError - Callback when upload fails (error) => {}
 * @param {function} onUploadProgress - Callback for progress updates (progress) => {}
 * @param {boolean} disabled - Disable the upload zone
 * @param {array} acceptedFileTypes - Accepted file extensions ['.jpg', '.jpeg', '.png', '.webp', '.gif']
 * @param {number} maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param {boolean} showPreview - Show image preview after selection (default: true)
 * @param {function} onFileSelect - Callback when file is selected but before upload (file) => {}
 * 
 * Usage:
 * <ImageUploadZone
 *   onUploadComplete={(file) => console.log('Upload complete:', file)}
 *   onUploadError={(error) => console.error('Upload error:', error)}
 *   onUploadProgress={(progress) => console.log('Progress:', progress)}
 *   showPreview={true}
 * />
 */
const ImageUploadZone = ({ 
  onUploadComplete, 
  onUploadError, 
  onUploadProgress,
  onFileSelect,
  disabled = false,
  acceptedFileTypes = ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  showPreview = true
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageDimensions, setImageDimensions] = useState(null)
  const fileInputRef = useRef(null)
  const uploadXhrRef = useRef(null)
  

  // Validate file before upload
  const validateFile = (file) => {
    const errors = []

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const fileExtension = file.name.toLowerCase().split('.').pop()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      errors.push('Only JPG, PNG, WebP, and GIF images are allowed')
    }

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size must be less than ${Math.round(maxFileSize / (1024 * 1024))}MB`)
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File cannot be empty')
    }

    return errors
  }

  // Get image dimensions
  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: (img.naturalWidth / img.naturalHeight).toFixed(2)
        }
        URL.revokeObjectURL(url)
        resolve(dimensions)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(null)
      }
      
      img.src = url
    })
  }

  // Create image preview
  const createImagePreview = (file) => {
    if (!showPreview) return

    const url = URL.createObjectURL(file)
    setImagePreview(url)
    
    // Clean up previous preview
    return () => {
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }


  // Handle file upload
  const uploadFile = async (file) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()
      uploadXhrRef.current = xhr

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
          if (onUploadProgress) {
            onUploadProgress(progress)
          }
        }
      })

      // Handle response
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch (error) {
              reject(new Error('Invalid response format'))
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              reject(new Error(errorResponse.error || errorResponse.details || 'Upload failed'))
            } catch (error) {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          }
        }

        xhr.onerror = () => {
          reject(new Error('Network error during upload'))
        }

        xhr.ontimeout = () => {
          reject(new Error('Upload timeout'))
        }

        xhr.onabort = () => {
          reject(new Error('Upload cancelled'))
        }
      })

      // Configure and send request
      xhr.open('POST', '/api/upload/image')
      xhr.timeout = 120000 // 2 minute timeout
      xhr.send(formData)

      const response = await uploadPromise

      if (response.success && response.file) {
        setUploadProgress(100)
        if (onUploadComplete) {
          onUploadComplete(response.file)
        }
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error.message || 'Upload failed'
      setError(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    } finally {
      setUploading(false)
      uploadXhrRef.current = null
      setTimeout(() => {
        setUploadProgress(0)
      }, 2000) // Reset progress after 2 seconds
    }
  }

  // Cancel upload
  const cancelUpload = () => {
    if (uploadXhrRef.current) {
      uploadXhrRef.current.abort()
      uploadXhrRef.current = null
    }
    setUploading(false)
    setUploadProgress(0)
  }

  // Handle file selection
  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return

    const file = files[0] // Only handle single file
    const validationErrors = validateFile(file)

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join(', ')
      setError(errorMessage)
      if (onUploadError) {
        onUploadError(errorMessage)
      }
      return
    }

    // Clear previous state
    setError(null)
    setSelectedFile(file)
    
    // Get image dimensions
    const dimensions = await getImageDimensions(file)
    setImageDimensions(dimensions)
    
    // Create preview
    const cleanupPreview = createImagePreview(file)
    
    // Notify file selection
    if (onFileSelect) {
      onFileSelect(file)
    }

    // Auto-upload the file
    await uploadFile(file)
    
    // Cleanup preview after upload
    if (cleanupPreview) {
      setTimeout(cleanupPreview, 5000) // Clean up after 5 seconds
    }
  }, [maxFileSize, onUploadComplete, onUploadError, onUploadProgress, onFileSelect, showPreview])

  // Drag and drop handlers
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
  }, [])

  const handleDragOut = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (disabled || uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, uploading, handleFiles])

  // File input change handler
  const handleFileInputChange = useCallback((e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    // Reset input to allow selecting the same file again
    e.target.value = ''
  }, [handleFiles])

  // Open file browser
  const openFileDialog = () => {
    if (disabled || uploading) return
    fileInputRef.current?.click()
  }

  // Clear error
  const clearError = () => {
    setError(null)
  }

  // Clear preview and selected file
  const clearSelection = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setImageDimensions(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
  }

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Mandatory Upload Header */}
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-red-600 text-lg font-bold">*</span>
          <div>
            <h4 className="text-red-800 font-semibold text-sm">Product Image Required</h4>
            <p className="text-red-700 text-xs mt-1">
              Every product must have a high-quality image for customers to preview before purchase
            </p>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragActive 
            ? 'border-primary bg-primary/5 scale-102' 
            : error 
              ? 'border-error bg-error/5' 
              : uploading 
                ? 'border-info bg-info/5' 
                : 'border-red-300 hover:border-primary hover:bg-primary/5 bg-red-50/30'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* Image Preview */}
        {imagePreview && showPreview && !uploading && !error && (
          <div className="mb-6">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 max-w-full rounded-lg shadow-md object-contain"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelection()
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-error text-white rounded-full flex items-center justify-center text-sm hover:bg-error/80 transition-colors"
              >
                ×
              </button>
            </div>
            {imageDimensions && (
              <div className="mt-2 text-sm text-gray-600">
                <p>{imageDimensions.width} × {imageDimensions.height} pixels</p>
                <p>{formatFileSize(selectedFile?.size || 0)}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload content */}
        <div className="space-y-4">
          {uploading ? (
            <div className="space-y-4">
              {/* Upload progress icon */}
              <div className="w-16 h-16 mx-auto relative">
                <div className="w-16 h-16 border-4 border-info/20 rounded-full"></div>
                <div 
                  className="absolute top-0 left-0 w-16 h-16 border-4 border-info border-t-transparent rounded-full animate-spin"
                  style={{
                    background: `conic-gradient(from 0deg, #3498db ${uploadProgress * 3.6}deg, transparent ${uploadProgress * 3.6}deg)`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-info">{uploadProgress}%</span>
                </div>
              </div>
              <div>
                <p className="text-lg font-medium text-info">Uploading Image...</p>
                <p className="text-sm text-gray-600">Please wait while we upload your image</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cancelUpload()
                  }}
                  className="mt-2 text-sm text-error hover:text-error/80 transition-colors"
                >
                  Cancel Upload
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              {/* Error icon */}
              <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-error">Upload Failed</p>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    clearError()
                  }}
                  className="mt-2 text-sm text-primary hover:text-primary-light transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Upload icon */}
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                dragActive 
                  ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg transform scale-110' 
                  : 'bg-gradient-to-br from-blue-100 to-primary/10 text-primary hover:from-primary/20 hover:to-blue-100'
              }`}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Upload text */}
              <div className="space-y-3">
                <p className="text-xl font-semibold text-primary">
                  {dragActive ? '✨ Drop your image here' : imagePreview ? '🖼️ Upload Another Image' : '🖼️ Choose Your Best Image'}
                </p>
                <p className="text-gray-600 max-w-sm mx-auto leading-relaxed">
                  {dragActive 
                    ? 'Release to upload your image' 
                    : imagePreview 
                      ? 'Want to try a different image? Upload another one'
                      : 'Upload a high-quality image that showcases your artwork. This is the first thing customers will see.'
                  }
                </p>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <span>Drag & Drop</span>
                  </span>
                  <span className="text-gray-300">or</span>
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Click to Browse</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload overlay for drag state */}
        {dragActive && (
          <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
            <div className="text-primary font-medium">Drop to upload</div>
          </div>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && uploadProgress > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-info h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* File type and size info */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Formats</div>
          <div className="text-sm font-medium text-gray-700">JPG, PNG, WebP, GIF</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Max Size</div>
          <div className="text-sm font-medium text-gray-700">{Math.round(maxFileSize / (1024 * 1024))}MB</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Processing</div>
          <div className="text-sm font-medium text-gray-700">Auto-optimized</div>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          📷 Tip: Use high-resolution images for the best customer experience
        </p>
      </div>
    </div>
  )
}

export default ImageUploadZone