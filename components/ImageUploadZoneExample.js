import { useState } from 'react'
import ImageUploadZone from './ImageUploadZone'

/**
 * ImageUploadZone Usage Example
 * 
 * This component demonstrates how to use the ImageUploadZone component
 * with proper event handling and state management.
 */
const ImageUploadZoneExample = () => {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadStatus, setUploadStatus] = useState('')
  const [currentProgress, setCurrentProgress] = useState(0)

  const handleUploadComplete = (file) => {
    setUploadedFiles(prev => [...prev, file])
    setUploadStatus('Upload successful!')
    
    // Clear status after 3 seconds
    setTimeout(() => {
      setUploadStatus('')
    }, 3000)
  }

  const handleUploadError = (error) => {
    console.error('Upload error:', error)
    setUploadStatus(`Upload failed: ${error}`)
    
    // Clear status after 5 seconds
    setTimeout(() => {
      setUploadStatus('')
    }, 5000)
  }

  const handleUploadProgress = (progress) => {
    setCurrentProgress(progress)
  }

  const handleFileSelect = (file) => {
    setUploadStatus(`Selected: ${file.name}`)
  }

  const clearUploadedFiles = () => {
    setUploadedFiles([])
    setUploadStatus('')
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-2">Image Upload Demo</h2>
        <p className="text-gray-600">
          Drag & drop or click to upload JPG, PNG, WebP, or GIF images (max 10MB)
        </p>
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`p-4 rounded-lg text-center ${
          uploadStatus.includes('failed') || uploadStatus.includes('error')
            ? 'bg-error/10 text-error border border-error/20'
            : uploadStatus.includes('successful')
            ? 'bg-success/10 text-success border border-success/20'
            : 'bg-info/10 text-info border border-info/20'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* Progress Indicator */}
      {currentProgress > 0 && currentProgress < 100 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Uploading...</span>
            <span>{currentProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-info h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Image Upload Zone */}
      <ImageUploadZone
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
        onUploadProgress={handleUploadProgress}
        onFileSelect={handleFileSelect}
        showPreview={true}
        maxFileSize={10 * 1024 * 1024} // 10MB
        acceptedFileTypes={['.jpg', '.jpeg', '.png', '.webp', '.gif']}
        disabled={false}
      />

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-primary">
              Uploaded Images ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearUploadedFiles}
              className="text-sm text-error hover:text-error/80 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{file.fileName}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                    <span>{formatFileSize(file.fileSize)}</span>
                    {file.width && file.height && (
                      <span>{file.width} × {file.height}px</span>
                    )}
                    {file.format && (
                      <span className="uppercase">{file.format}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Complete
                  </span>
                  {file.processingTime && (
                    <span className="text-xs text-gray-500">
                      {file.processingTime}ms
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Usage Instructions:</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Drag and drop image files directly onto the upload area</li>
          <li>• Click the upload area to browse and select files</li>
          <li>• Supported formats: JPG, JPEG, PNG, WebP, GIF</li>
          <li>• Maximum file size: 10MB per image</li>
          <li>• Images are automatically validated and processed</li>
          <li>• Preview shows before upload begins</li>
          <li>• Upload progress is tracked in real-time</li>
          <li>• Cancel upload anytime during progress</li>
        </ul>
      </div>

      {/* Integration Code Example */}
      <div className="border rounded-lg p-6 bg-gray-50">
        <h4 className="font-semibold text-gray-900 mb-3">Basic Integration:</h4>
        <pre className="text-sm text-gray-700 overflow-x-auto">
{`import ImageUploadZone from './components/ImageUploadZone'

const MyComponent = () => {
  const handleComplete = (file) => {
  }

  const handleError = (error) => {
    console.error('Error:', error)
  }

  return (
    <ImageUploadZone
      onUploadComplete={handleComplete}
      onUploadError={handleError}
      showPreview={true}
    />
  )
}`}
        </pre>
      </div>
    </div>
  )
}

export default ImageUploadZoneExample