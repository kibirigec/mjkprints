import { useState } from 'react'
import Image from 'next/image'

export default function DashboardTable({ products = [], onEdit, onDelete, onRefresh, onAddProduct, isLoading = false }) {
  const [isDeleting, setIsDeleting] = useState(null)
  const [isDownloading, setIsDownloading] = useState(null)
  
  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : []

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    setIsDeleting(productId)
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onRefresh()
      } else {
        alert('Failed to delete product')
      }
    } catch (error) {
      alert('Error deleting product')
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-primary">My Products</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your digital art collection
            </p>
          </div>
          <button
            onClick={onAddProduct}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            aria-label="Add new product"
          >
            <svg 
              className="w-5 h-5 mr-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PDF File
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Added
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {safeProducts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg 
                        className="w-8 h-8 text-gray-400" 
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
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No products yet
                      </h3>
                      <p className="text-gray-500 mb-4 max-w-sm">
                        Start building your digital art collection by adding your first product
                      </p>
                      <button
                        onClick={onAddProduct}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      >
                        <svg 
                          className="w-5 h-5 mr-2" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M12 4v16m8-8H4" 
                          />
                        </svg>
                        Add Your First Product
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              safeProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 relative bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-primary">{product.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {product.file_uploads ? (
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                            {product.file_uploads.file_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span>{formatFileSize(product.file_uploads.file_size)}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.file_uploads.processing_status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : product.file_uploads.processing_status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : product.file_uploads.processing_status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.file_uploads.processing_status}
                          </span>
                        </div>
                        {product.file_uploads.page_count && (
                          <div className="text-xs text-gray-500">
                            {product.file_uploads.page_count} pages
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm">No PDF</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-lg font-semibold text-primary">
                      ${product.price}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="text-secondary hover:text-secondary/80 font-medium transition-colors text-sm"
                        title="Edit product"
                      >
                        Edit
                      </button>
                      
                      {product.file_uploads && product.file_uploads.processing_status === 'completed' && (
                        <>
                          <button
                            onClick={() => handlePreviewPDF(product)}
                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm"
                            title="Preview PDF"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(product)}
                            disabled={isDownloading === product.id}
                            className="text-green-600 hover:text-green-800 font-medium transition-colors disabled:opacity-50 text-sm"
                            title="Download PDF"
                          >
                            {isDownloading === product.id ? 'Downloading...' : 'Download'}
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={isDeleting === product.id}
                        className="text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50 text-sm"
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