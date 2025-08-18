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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {safeProducts.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-16 text-center">
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
                      <p className="text-gray-500 max-w-sm">
                        Start building your digital art collection by adding your first product
                      </p>
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
                    <span className="text-lg font-semibold text-primary">
                      ${product.price}
                    </span>
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