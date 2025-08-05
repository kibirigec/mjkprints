import { useState, useCallback, useRef } from 'react'

const PDFUploadZone = ({ 
  onUploadComplete, 
  onUploadError, 
  onUploadProgress,
  disabled = false,
  acceptedFileTypes = ['.pdf'],
  maxFileSize = 50 * 1024 * 1024 // 50MB
}) => {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Validate file before upload
  const validateFile = (file) => {
    const errors = []

    // Check file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      errors.push('Only PDF files are allowed')
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

  // Handle file upload
  const uploadFile = async (file) => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('pdf', file)

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest()

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
      })

      // Configure and send request
      xhr.open('POST', '/api/upload/pdf')
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
      setTimeout(() => {
        setUploadProgress(0)
      }, 2000) // Reset progress after 2 seconds
    }
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

    await uploadFile(file)
  }, [maxFileSize, onUploadComplete, onUploadError, onUploadProgress])

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
                : 'border-gray-300 hover:border-primary hover:bg-primary/5'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        {/* Upload icon and text */}
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
                <p className="text-lg font-medium text-info">Uploading PDF...</p>
                <p className="text-sm text-gray-600">Please wait while we process your file</p>
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
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors ${
                dragActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {/* Upload text */}
              <div className="space-y-2">
                <p className="text-lg font-medium text-primary">
                  {dragActive ? 'Drop your PDF here' : 'Upload PDF File'}
                </p>
                <p className="text-sm text-gray-600">
                  Drag and drop your PDF file here, or click to browse
                </p>
                <p className="text-xs text-gray-500">
                  Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB
                </p>
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
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Supported formats: PDF files only</p>
        <p>Your PDF will be processed to generate preview images automatically</p>
      </div>
    </div>
  )
}

export default PDFUploadZone