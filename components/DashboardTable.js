import { useState } from 'react'
import Image from 'next/image'

export default function DashboardTable({ products = [], onEdit, onDelete, onRefresh, onAddProduct, isLoading = false }) {
  const [isDeleting, setIsDeleting] = useState(null)
  const [isDownloading, setIsDownloading] = useState(null)
  
  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : []

  const handleDelete = async (productId) => {
    // Find the product to get details for confirmation
    const product = safeProducts.find(p => p.id === productId)
    const productName = product ? product.title : 'this product'
    const hasFiles = product?.file_uploads || product?.image_file_id
    
    const confirmMessage = `🗑️ DELETE PRODUCT

Product: "${productName}"

⚠️ WARNING: This will permanently delete:
- The product listing
- Any associated PDF files
- Any associated image files
- All product data

${hasFiles ? '🚨 This product has associated files that will also be deleted!' : ''}

This action cannot be undone. Are you sure?`

    if (!confirm(confirmMessage)) return
    
    setIsDeleting(productId)
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const result = await response.json()
        onRefresh()
      } else {
        const errorData = await response.json()
        console.error(`[DASHBOARD] Delete failed:`, errorData)
        
        // Show user-friendly error message
        const errorMessage = errorData.details || errorData.error || 'Failed to delete product'
        alert(`❌ Delete Failed\n\n${errorMessage}`)
      }
    } catch (error) {
      console.error(`[DASHBOARD] Delete error:`, error)
      alert(`❌ Error deleting product\n\nNetwork error: ${error.message}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDownloadPDF = async (product) => {
    if (!product.file_uploads || product.file_uploads.processing_status !== 'completed') {
      alert('PDF file is not available for download')
      return
    }

    setIsDownloading(product.id)
    
    try {
      // Create download URL using the storage path
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const downloadUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${product.file_uploads.storage_path}`
      
      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = product.file_uploads.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download PDF')
    } finally {
      setIsDownloading(null)
    }
  }

  const handlePreviewPDF = (product) => {
    if (!product.file_uploads || product.file_uploads.processing_status !== 'completed') {
      alert('PDF file is not available for preview')
      return
    }

    // Open PDF in new tab for preview
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const previewUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${product.file_uploads.storage_path}`
    window.open(previewUrl, '_blank')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {safeProducts.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="4" className="px-8 py-20 text-center">
                  <div className="flex flex-col items-center space-y-6">
                    <div className="w-20 h-20 bg-brand-light-ivory rounded-full flex items-center justify-center shadow-inner">
                      <svg 
                        className="w-10 h-10 text-brand-blush" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 5l7 7-7 7" 
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-800 mb-3">
                        No products yet
                      </h3>
                      <p className="text-gray-500 max-w-sm text-lg leading-relaxed">
                        Start building your digital art collection by adding your first product.
                        It's quick and easy!
                      </p>
                    </div>
                    <button
                      onClick={onAddProduct}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Product
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              safeProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150 ease-in-out">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-5">
                      <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 64px"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-lg text-primary mb-1">{product.title}</div>
                        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xl font-bold text-primary">
                      ${product.price}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {product.file_uploads ? (
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.file_uploads.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                        product.file_uploads.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.file_uploads.processing_status}
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        No File
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onEdit(product)}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-150 ease-in-out"
                        title="Edit product"
                      >
                        Edit
                      </button>
                      
                      {product.file_uploads && product.file_uploads.processing_status === 'completed' && (
                        <>
                          <button
                            onClick={() => handlePreviewPDF(product)}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-150 ease-in-out"
                            title="Preview PDF"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(product)}
                            disabled={isDownloading === product.id}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Download PDF"
                          >
                            {isDownloading === product.id ? 'Downloading...' : 'Download'}
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={isDeleting === product.id}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete product"
                      >
                        {isDeleting === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}