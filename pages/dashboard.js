"use client";
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Footer from '../components/Footer';
import DashboardTable from '../components/DashboardTable';
import ProductModal from '../components/ProductModal';
import PasscodeProtection from '../components/PasscodeProtection';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Dashboard() {
  const { logout, updateActivity } = useAdminAuth()
  const [products, setProducts] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingProduct, setEditingProduct] = useState(null);

  // Update activity when user interacts with dashboard
  useEffect(() => {
    const handleUserActivity = () => {
      updateActivity()
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [updateActivity])

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === 'files' && products.length > 0) {
      fetchFiles();
    }
  }, [activeTab, products]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFiles = async () => {
    setIsFilesLoading(true);
    try {
      // Extract files from products and add additional file information
      const productFiles = products
        .filter(product => product.file_uploads)
        .map(product => ({
          ...product.file_uploads,
          product_title: product.title,
          product_id: product.id,
          created_at: product.created_at
        }));
      setFiles(productFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      setFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  };

  // Modal handlers
  const openAddModal = () => {
    console.log('Add Product button clicked - opening modal');
    setModalMode('add');
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSave = (savedProduct) => {
    // Refresh products list
    fetchProducts();
  };

  const handleModalSuccess = () => {
    // Optional: Additional success handling if needed
  };

  const handleEdit = (product) => {
    openEditModal(product);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeletingFile(fileId)
    
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh both files and products data
        await fetchProducts()
        if (activeTab === 'files') {
          await fetchFiles()
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to delete file: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error deleting file')
    } finally {
      setIsDeletingFile(null)
    }
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard - MJK Prints</title>
        <meta name="description" content="Secure admin dashboard for managing digital prints" />
      </Head>
      
      <PasscodeProtection>
        <div className="min-h-screen bg-accent">
          {/* Minimal Header with Logo Only */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Logo Only */}
                <Link href="/" className="flex items-center space-x-3 group">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                    <span className="text-accent font-bold text-xl">M</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors duration-200">MJK Prints</span>
                    <div className="text-xs text-gray-500 -mt-1">Digital Art Gallery</div>
                  </div>
                </Link>
                
                {/* Admin Controls */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-primary">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm text-gray-600 hover:text-primary transition-colors flex items-center space-x-1"
                  >
                    <span>Logout</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-64">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-primary mb-6">Dashboard</h2>
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                      activeTab === 'products'
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Products
                  </button>
                  <button
                    disabled
                    className="w-full text-left px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    PDF Files
                  </button>
                  <button
                    disabled
                    className="w-full text-left px-4 py-2 rounded-lg text-gray-400 cursor-not-allowed"
                  >
                    Settings
                  </button>
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
              {activeTab === 'products' && (
                <div className="bg-white rounded-lg shadow-md">
                  {/* Header with Add Product Button */}
                  <div className="p-6 border-b border-gray-200 bg-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
                      <div>
                        <h1 className="text-2xl font-bold text-primary">Your Products</h1>
                        <p className="text-gray-600 mt-1">Manage your digital art collection</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={openAddModal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm hover:shadow-md min-h-[44px] whitespace-nowrap w-full sm:w-auto"
                        >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                          <span>Add Product</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="p-6">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-gray-600">Loading products...</p>
                        </div>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products yet</h3>
                        <p className="text-gray-600 mb-6">Get started by adding your first digital art product</p>
                        <button
                          onClick={openAddModal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                        >
                          Add Your First Product
                        </button>
                      </div>
                    ) : (
                      <DashboardTable 
                        products={products} 
                        onEdit={handleEdit} 
                        onRefresh={fetchProducts} 
                      />
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="bg-white rounded-lg shadow-md">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-primary">PDF Files</h1>
                        <p className="text-gray-600 mt-1">Manage your uploaded PDF files</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {files.length} file{files.length !== 1 ? 's' : ''} total
                      </div>
                    </div>
                  </div>

                  {/* Files Content */}
                  <div className="p-6">
                    {isFilesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-3">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-gray-600">Loading files...</p>
                        </div>
                      </div>
                    ) : files.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No PDF files found</h3>
                        <p className="text-gray-600 mb-6">Upload PDF files by creating products with file attachments</p>
                        <button
                          onClick={openAddModal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                        >
                          Create Product with PDF
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {files.map((file) => (
                          <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {file.file_name}
                                </h4>
                                <p className="text-sm text-gray-500 truncate">
                                  Product: {file.product_title}
                                </p>
                                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  {file.page_count && <span>{file.page_count} pages</span>}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    file.processing_status === 'completed' 
                                      ? 'bg-green-100 text-green-800'
                                      : file.processing_status === 'processing'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : file.processing_status === 'failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {file.processing_status}
                                  </span>
                                </div>
                                <div className="mt-3 flex space-x-2">
                                  {file.processing_status === 'completed' && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                          const previewUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${file.storage_path}`;
                                          window.open(previewUrl, '_blank');
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                      >
                                        Preview
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                          const downloadUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${file.storage_path}`;
                                          const link = document.createElement('a');
                                          link.href = downloadUrl;
                                          link.download = file.file_name;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }}
                                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                                      >
                                        Download
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    onClick={() => handleDeleteFile(file.id, file.file_name)}
                                    disabled={isDeletingFile === file.id}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                                  >
                                    {isDeletingFile === file.id ? 'Deleting...' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h1 className="text-2xl font-bold text-primary mb-6">Settings</h1>
                  <p className="text-gray-600">Settings configuration coming soon...</p>
                </div>
              )}
            </main>
          </div>
        </div>

        {/* Product Modal */}
        <ProductModal
          isOpen={isModalOpen}
          onClose={closeModal}
          mode={modalMode}
          editProduct={editingProduct}
          onSave={handleModalSave}
          onSuccess={handleModalSuccess}
        />
          <Footer />
        </div>
      </PasscodeProtection>
    </>
  );
}
