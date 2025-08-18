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
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // 'all', 'pdf', 'image'
  
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
      // Fetch all files directly from file_uploads table
      const response = await fetch('/api/debug/list-all-files');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch files');
      }

      const allFiles = [];
      
      // Get files from the file_uploads table directly
      if (Array.isArray(result.fileUploads)) {
        result.fileUploads.forEach(file => {
          // Find which product (if any) references this file
          const referencingProduct = result.products?.find(product => 
            product.pdf_file_id === file.id || product.image_file_id === file.id
          );
          
          allFiles.push({
            ...file,
            product_title: referencingProduct?.title || null,
            product_id: referencingProduct?.id || null,
            is_orphaned: !referencingProduct,
            file_status: referencingProduct ? 'linked' : 'orphaned'
          });
        });
      }

      // Sort files by creation date (newest first)
      allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setFiles(allFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      setFiles([]);
    } finally {
      setIsFilesLoading(false);
    }
  };

  // Modal handlers
  const openAddModal = () => {
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

  // Filter files based on selected type
  const getFilteredFiles = () => {
    if (fileTypeFilter === 'all') return files
    if (fileTypeFilter === 'orphaned') return files.filter(file => file.is_orphaned)
    return files.filter(file => file.file_type === fileTypeFilter)
  }

  const filteredFiles = getFilteredFiles()

  const handleDeleteFile = async (fileId, fileName) => {
    // Find the file to get detailed info for confirmation
    const fileToDelete = files.find(f => f.id === fileId)
    if (!fileToDelete) {
      alert('File not found!')
      return
    }

    // Create detailed confirmation message
    const fileType = fileToDelete.file_type === 'pdf' ? 'PDF file' : 'Image file'
    const linkStatus = fileToDelete.is_orphaned ? 'NOT linked to any product' : `linked to product: "${fileToDelete.product_title}"`
    
    const confirmMessage = `🗑️ DELETE ${fileType.toUpperCase()}

File: "${fileName}"
Type: ${fileType}
Status: ${linkStatus}
Storage: ${fileToDelete.storage_path}

⚠️ WARNING: ${fileToDelete.file_type === 'pdf' ? 'This will delete the actual PDF file that customers would download!' : 'This will delete the cover/preview image for the product.'}

${!fileToDelete.is_orphaned ? '🚨 This file is linked to a product and deleting it may break the product display!' : '✅ This orphaned file can be safely deleted.'}

Are you sure you want to permanently delete this ${fileType}?`

    if (!confirm(confirmMessage)) {
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
                        <h1 className="text-2xl font-bold text-primary">All Files</h1>
                        <p className="text-gray-600 mt-1">Manage your uploaded files (PDFs and images)</p>
                      </div>
                      <div className="text-sm space-y-2">
                        <div className="text-gray-600 font-medium">
                          {filteredFiles.length} of {files.length} file{files.length !== 1 ? 's' : ''} shown
                        </div>
                        {files.length > 0 && (
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-4 text-xs">
                              <span className="flex items-center text-red-600">
                                📄 {files.filter(f => f.file_type === 'pdf').length} PDF files
                              </span>
                              <span className="flex items-center text-purple-600">
                                🖼️ {files.filter(f => f.file_type === 'image').length} Image files
                              </span>
                            </div>
                            <div className="flex space-x-4 text-xs">
                              <span className="flex items-center text-blue-600">
                                🔗 {files.filter(f => !f.is_orphaned).length} linked
                              </span>
                              <span className="flex items-center text-orange-600">
                                ⚠️ {files.filter(f => f.is_orphaned).length} orphaned
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* File Type Filter Buttons */}
                  {files.length > 0 && (
                    <div className="px-6 pb-4 border-b border-gray-100">
                      <div className="flex space-x-2">
                        <span className="text-sm text-gray-600 font-medium mr-3">Filter by type:</span>
                        <button
                          onClick={() => setFileTypeFilter('all')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            fileTypeFilter === 'all'
                              ? 'bg-gray-800 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          All Files ({files.length})
                        </button>
                        <button
                          onClick={() => setFileTypeFilter('pdf')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            fileTypeFilter === 'pdf'
                              ? 'bg-red-600 text-white'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                        >
                          📄 PDFs ({files.filter(f => f.file_type === 'pdf').length})
                        </button>
                        <button
                          onClick={() => setFileTypeFilter('image')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            fileTypeFilter === 'image'
                              ? 'bg-purple-600 text-white'
                              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                          }`}
                        >
                          🖼️ Images ({files.filter(f => f.file_type === 'image').length})
                        </button>
                        <button
                          onClick={() => setFileTypeFilter('orphaned')}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            fileTypeFilter === 'orphaned'
                              ? 'bg-orange-600 text-white'
                              : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          ⚠️ Orphaned ({files.filter(f => f.is_orphaned).length})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info Section for Orphaned Files */}
                  {files.filter(f => f.is_orphaned).length > 0 && (
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 my-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-amber-800">
                            {files.filter(f => f.is_orphaned).length} Orphaned Files Found
                          </h3>
                          <p className="text-sm text-amber-700 mt-1">
                            Orphaned files exist in storage but aren't linked to any product. You can safely delete them to clean up your storage.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                    ) : filteredFiles.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {fileTypeFilter === 'all' 
                            ? 'No files have been uploaded yet.'
                            : `No ${fileTypeFilter === 'orphaned' ? 'orphaned' : fileTypeFilter.toUpperCase()} files found. Try a different filter.`
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFiles.map((file) => (
                          <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                {file.file_type === 'pdf' ? (
                                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {file.file_name}
                                </h4>
                                <p className="text-sm text-gray-500 truncate">
                                  {file.product_title ? (
                                    <>Product: {file.product_title}</>
                                  ) : (
                                    <span className="text-amber-600">Not linked to any product</span>
                                  )}
                                </p>
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center flex-wrap gap-2 text-xs">
                                    <span className="text-gray-500">{formatFileSize(file.file_size)}</span>
                                    {file.page_count && <span className="text-gray-500">{file.page_count} pages</span>}
                                    
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      file.file_type === 'pdf' 
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {file.file_type === 'pdf' ? '📄 PDF' : '🖼️ IMAGE'}
                                    </span>
                                    
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
                                    
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      file.is_orphaned
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {file.is_orphaned ? '⚠️ Orphaned' : '🔗 Linked'}
                                    </span>
                                  </div>
                                  
                                  {/* Storage Path for debugging */}
                                  <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded border break-all">
                                    <strong>Storage:</strong> <span className="break-words">{file.storage_path}</span>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
                                  {file.processing_status === 'completed' && (
                                    <>
                                      <button 
                                        onClick={() => {
                                          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                                          const previewUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${file.storage_path}`;
                                          window.open(previewUrl, '_blank');
                                        }}
                                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
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
                                        className="text-xs sm:text-sm text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-50"
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
