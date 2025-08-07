import Head from 'next/head'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ImageUploadZoneExample from '../components/ImageUploadZoneExample'

/**
 * Test page for the ImageUploadZone component
 * 
 * This page provides a full demonstration of the ImageUploadZone component
 * with all its features and capabilities.
 * 
 * Access this page at: http://localhost:3000/test-image-upload
 */
export default function TestImageUpload() {
  return (
    <>
      <Head>
        <title>Image Upload Test - MJK Prints</title>
        <meta name="description" content="Test page for image upload functionality" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-4">
                Image Upload Component Test
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                This is a test page to demonstrate the ImageUploadZone component. 
                It includes drag & drop functionality, image preview, upload progress, 
                and comprehensive error handling.
              </p>
            </div>

            <ImageUploadZoneExample />

            {/* Additional Test Scenarios */}
            <div className="max-w-4xl mx-auto mt-12 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Feature Highlights */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">
                    Key Features
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Drag & drop with visual feedback</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Real-time image preview with dimensions</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Upload progress with cancel option</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>File validation (type, size, dimensions)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Error handling and user feedback</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Mobile-responsive design</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">✓</span>
                      <span>Accessibility features</span>
                    </li>
                  </ul>
                </div>

                {/* Technical Specifications */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-primary mb-4">
                    Technical Specs
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Max File Size:</dt>
                      <dd className="font-medium">10MB</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Supported Formats:</dt>
                      <dd className="font-medium">JPG, PNG, WebP, GIF</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Max Dimensions:</dt>
                      <dd className="font-medium">8192×8192px</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Min Dimensions:</dt>
                      <dd className="font-medium">10×10px</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Upload Timeout:</dt>
                      <dd className="font-medium">2 minutes</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Rate Limit:</dt>
                      <dd className="font-medium">10/minute</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Storage:</dt>
                      <dd className="font-medium">Supabase</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* API Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  API Integration
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Upload Endpoint</h4>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      POST /api/upload/image
                    </code>
                    <p className="text-sm text-gray-600 mt-2">
                      Accepts multipart/form-data with &apos;image&apos; field
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Response Format</h4>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`{
  "success": true,
  "file": {
    "id": "uuid",
    "fileName": "image.jpg",
    "fileSize": 1024000,
    "width": 1920,
    "height": 1080,
    "format": "jpeg"
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Testing Instructions */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-amber-900 mb-4">
                  Testing Instructions
                </h3>
                <div className="text-sm text-amber-800 space-y-2">
                  <p><strong>Test valid uploads:</strong> Try uploading JPG, PNG, WebP, or GIF files under 10MB</p>
                  <p><strong>Test file validation:</strong> Try uploading non-image files or files over 10MB</p>
                  <p><strong>Test drag & drop:</strong> Drag files from your file manager onto the upload area</p>
                  <p><strong>Test progress:</strong> Upload larger files to see the progress indicator</p>
                  <p><strong>Test cancellation:</strong> Start an upload and click &quot;Cancel Upload&quot;</p>
                  <p><strong>Test error recovery:</strong> Disconnect internet during upload to test error handling</p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}