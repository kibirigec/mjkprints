import DebugImageFetch from '../components/DebugImageFetch'

export default function DebugImagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Image Upload Debug</h1>
          <p className="text-gray-600">Testing if uploaded images are being fetched from database</p>
        </div>
        
        <DebugImageFetch />
        
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Homepage
          </a>
        </div>
      </div>
    </div>
  )
}