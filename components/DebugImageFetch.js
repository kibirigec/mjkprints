import { useState, useEffect } from 'react'
import Image from 'next/image'
import { normalizeProductData } from '../utils/productUtils'
import { getProductImage } from '../lib/supabase'

export default function DebugImageFetch() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [apiResponse, setApiResponse] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        
        // Store the raw API response for debugging
        setApiResponse({
          status: response.status,
          ok: response.ok,
          data: data
        })
        
        if (response.ok) {
          setProducts(data.products || data || [])
        } else {
          setError(data.error || 'Failed to fetch products')
        }
      } catch (err) {
        setError('Network error: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const createTestProduct = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Debug Test Product',
          description: 'Test product to check image upload functionality',
          price: 9.99,
          image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop&crop=center'
        })
      })
      
      if (response.ok) {
        // Refresh products after creating
        const productsResponse = await fetch('/api/products')
        const data = await productsResponse.json()
        setProducts(data.products || data || [])
        setApiResponse({
          status: productsResponse.status,
          ok: productsResponse.ok,
          data: data
        })
      }
    } catch (err) {
      console.error('Failed to create test product:', err)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4">🔍 Debug: Fetching Products...</h2>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 bg-red-100 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800">❌ Error</h2>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-6">🔍 Debug: Uploaded Images Test</h2>
      
      {/* API Response Debug */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
        <h3 className="font-bold mb-2">📡 API Response Debug</h3>
        <div className="text-sm space-y-1">
          <div>Status: {apiResponse?.status}</div>
          <div>OK: {apiResponse?.ok ? '✅' : '❌'}</div>
          <div>Products count: {Array.isArray(products) ? products.length : 'Not array'}</div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-blue-600">Raw API Response</summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-64">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </details>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const normalizedProduct = normalizeProductData(product)
          const displayImage = getProductImage(normalizedProduct)?.url || '/api/placeholder/200/200'
          const hasUploadedImage = normalizedProduct?.image_file_id
          
          // Debug the priority logic step by step
          let debugSteps = []
          
          // Check Priority 1: Uploaded image file
          const imageFileInfo = normalizedProduct?.file_info || normalizedProduct?.file_uploads || normalizedProduct?.image_file
          debugSteps.push({
            priority: 1,
            check: 'image_file_id exists',
            result: !!normalizedProduct?.image_file_id,
            value: normalizedProduct?.image_file_id || 'null'
          })
          
          if (normalizedProduct?.image_file_id) {
            debugSteps.push({
              priority: 1,
              check: 'image file info exists',
              result: !!imageFileInfo,
              value: imageFileInfo ? 'Found' : 'Missing'
            })
            
            if (imageFileInfo) {
              debugSteps.push({
                priority: 1,
                check: 'image_variants exists',
                result: !!imageFileInfo?.image_variants,
                value: imageFileInfo?.image_variants ? 'Found' : 'Missing'
              })
              
              if (imageFileInfo?.image_variants) {
                const variants = imageFileInfo.image_variants
                debugSteps.push({
                  priority: 1,
                  check: 'medium variant',
                  result: !!variants.medium,
                  value: variants.medium?.url || 'Missing'
                })
                debugSteps.push({
                  priority: 1,
                  check: 'large variant',
                  result: !!variants.large,
                  value: variants.large?.url || 'Missing'
                })
              }
              
              if (imageFileInfo?.storage_path) {
                debugSteps.push({
                  priority: 1,
                  check: 'storage_path fallback',
                  result: true,
                  value: imageFileInfo.storage_path
                })
              }
            }
          }
          
          // Check Priority 2: PDF preview
          const isPDF = normalizedProduct?.pdf_file_id || normalizedProduct?.page_count > 0
          if (isPDF) {
            const pdfFileInfo = normalizedProduct?.file_info || normalizedProduct?.file_uploads
            debugSteps.push({
              priority: 2,
              check: 'is PDF product',
              result: true,
              value: 'PDF detected'
            })
            
            if (pdfFileInfo?.preview_urls) {
              debugSteps.push({
                priority: 2,
                check: 'PDF preview_urls',
                result: true,
                value: Array.isArray(pdfFileInfo.preview_urls) ? `${pdfFileInfo.preview_urls.length} previews` : 'Found'
              })
            }
          }
          
          return (
            <div key={product.id} className="bg-white rounded-lg p-4 shadow-md">
              <h3 className="font-bold text-sm mb-2 truncate">{product.title}</h3>
              
              {/* Priority Debug Steps */}
              <div className="text-xs mb-3 space-y-1 bg-yellow-50 p-2 rounded">
                <div className="font-bold text-yellow-800">🔍 Priority Logic Debug:</div>
                {debugSteps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-gray-500">P{step.priority}:</span>
                    <span>{step.result ? '✅' : '❌'}</span>
                    <span className="flex-1">{step.check}</span>
                    <span className="text-xs text-gray-600 truncate max-w-32" title={step.value}>
                      {step.value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Summary Info */}
              <div className="text-xs text-gray-600 mb-3 space-y-1">
                <div>ID: {product.id}</div>
                <div>Has image_file_id: {hasUploadedImage ? '✅ YES' : '❌ NO'}</div>
                <div>image_file_id: {product.image_file_id || 'null'}</div>
                <div>External image URL: {product.image || 'none'}</div>
                <div>Display image: {displayImage.includes('placeholder') ? '📍 Placeholder' : displayImage.includes('supabase') ? '🗃️ Supabase' : '🌐 External'}</div>
                <div>Final URL: <span className="text-blue-600 text-xs break-all">{displayImage}</span></div>
              </div>

              {/* Image Display */}
              <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2">
                <Image
                  src={displayImage}
                  alt={product.title}
                  width={200}
                  height={200}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', displayImage)
                  }}
                />
              </div>
              
              {/* Image File Relationship Debug */}
              <details className="text-xs mb-2">
                <summary className="cursor-pointer text-blue-600">🖼️ Image File Relationship Data</summary>
                <div className="mt-2 space-y-2">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-bold text-blue-800">Image File ID:</div>
                    <div>{product.image_file_id || 'null'}</div>
                  </div>
                  
                  {product.image_file && (
                    <div className="bg-green-50 p-2 rounded">
                      <div className="font-bold text-green-800">image_file relationship:</div>
                      <pre className="text-xs overflow-auto max-h-24">
                        {JSON.stringify(product.image_file, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {product.file_info && (
                    <div className="bg-purple-50 p-2 rounded">
                      <div className="font-bold text-purple-800">file_info:</div>
                      <pre className="text-xs overflow-auto max-h-24">
                        {JSON.stringify(product.file_info, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {product.file_uploads && (
                    <div className="bg-orange-50 p-2 rounded">
                      <div className="font-bold text-orange-800">file_uploads:</div>
                      <pre className="text-xs overflow-auto max-h-24">
                        {JSON.stringify(product.file_uploads, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {normalizedProduct && (
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="font-bold text-gray-800">normalized product:</div>
                      <pre className="text-xs overflow-auto max-h-24">
                        {JSON.stringify({
                          image_file_id: normalizedProduct.image_file_id,
                          pdf_file_id: normalizedProduct.pdf_file_id,
                          file_info: normalizedProduct.file_info,
                          image_file: normalizedProduct.image_file
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>

              {/* Raw Data */}
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600">Raw Product Data</summary>
                <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(product, null, 2)}
                </pre>
              </details>
            </div>
          )
        })}
      </div>
      
      {products.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-600 mb-4">No products found in database</div>
          <button
            onClick={createTestProduct}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Test Product'}
          </button>
        </div>
      )}
    </div>
  )
}