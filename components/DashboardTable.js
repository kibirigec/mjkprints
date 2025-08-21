import { useState } from "react"
import Image from "next/image"

export default function DashboardTable({
  products = [],
  onEdit,
  onDelete,
  onRefresh,
  onAddProduct,
  isLoading = false,
}) {
  const [isDeleting, setIsDeleting] = useState(null)
  const [isDownloading, setIsDownloading] = useState(null)

  const safeProducts = Array.isArray(products) ? products : []

  const formatStatus = (status) => {
    if (!status) return <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">No File</span>
    if (status === "completed") return <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Completed</span>
    if (status === "processing") return <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 animate-pulse">Processing</span>
    return <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Failed</span>
  }

  return (
    <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {safeProducts.length === 0 && !isLoading ? (
              <tr>
                <td colSpan="4" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center shadow-inner">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-800">No products yet</h3>
                    <p className="text-gray-500 max-w-sm text-lg">
                      Start building your collection by adding your first product.
                    </p>
                    <button
                      onClick={onAddProduct}
                      className="px-6 py-3 rounded-full bg-primary text-white font-medium shadow hover:bg-primary-dark transform transition hover:scale-105"
                    >
                      + Add New Product
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              safeProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  {/* Product Info */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-gray-100 shadow">
                        <Image
                          src={product.image}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{product.title}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 max-w-xs">{product.description}</p>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-5">
                    <span className="text-lg font-bold text-primary">${product.price}</span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">{formatStatus(product.file_uploads?.processing_status)}</td>

                  {/* Actions */}
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="px-4 py-2 text-sm rounded-md border bg-white hover:bg-gray-50 shadow-sm transition"
                      >
                        Edit
                      </button>

                      {product.file_uploads?.processing_status === "completed" && (
                        <>
                          <button
                            onClick={() =>
                              window.open(
                                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mjk-prints-storage/${product.file_uploads.storage_path}`,
                                "_blank"
                              )
                            }
                            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => {
                              setIsDownloading(product.id)
                              const link = document.createElement("a")
                              link.href = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/mjk-prints-storage/${product.file_uploads.storage_path}`
                              link.download = product.file_uploads.file_name
                              link.click()
                              setIsDownloading(null)
                            }}
                            disabled={isDownloading === product.id}
                            className="px-4 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 shadow-sm transition disabled:opacity-50"
                          >
                            {isDownloading === product.id ? "Downloading..." : "Download"}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => onDelete(product.id)}
                        disabled={isDeleting === product.id}
                        className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm transition disabled:opacity-50"
                      >
                        {isDeleting === product.id ? "Deleting..." : "Delete"}
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
