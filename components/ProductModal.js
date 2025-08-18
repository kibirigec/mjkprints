import { useEffect, useRef } from 'react';
import { useProductForm } from '../hooks/useProductForm';
import PDFUploadZone from './PDFUploadZone';
import ImageUploadZone from './ImageUploadZone';
import PDFPreviewComponent from './PDFPreviewComponent';

const ProductModal = ({ isOpen, onClose, mode = 'add', editProduct, onSave, onSuccess }) => {
  const {
    formData, handleInputChange,
    uploadedPDF, pdfProcessingStatus, pdfError,
    processedPDFData,
    uploadedImage, imageProcessingStatus, imageError,
    processedImageData,
    uploadMode, handleUploadModeToggle,
    isSubmitting, errors, showSuccessMessage,
    titleInputRef,
    handleSubmit,
    handlePDFUploadComplete, handlePDFUploadError,
    handlePDFProcessingComplete, handlePDFProcessingError, clearPDFUpload,
    handleImageUploadComplete, handleImageUploadError, clearImageUpload,
    resetForm
  } = useProductForm({ mode, editProduct, onSave, onSuccess, onClose });

  const modalRef = useRef(null);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') handleClose(); };
    const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) handleClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      <div className="flex min-h-screen items-center justify-center p-4">
        <div ref={modalRef} className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col">
          {showSuccessMessage && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-success">{mode === 'edit' ? 'Product Updated!' : 'Product Added!'}</h3>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-primary">{mode === 'edit' ? 'Edit Product' : 'Add New Product'}</h2>
            <button onClick={handleClose} disabled={isSubmitting} className="p-2 hover:bg-gray-100 rounded-full">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              {errors.submit && <p className="text-error text-sm p-6">{errors.submit}</p>}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 flex-1">
                <div className="lg:col-span-3 space-y-6">
                  <h3 className="text-xl font-bold text-primary">1. Upload Digital Artwork (PDF)</h3>
                  {!uploadedPDF ? (
                    <PDFUploadZone onUploadComplete={handlePDFUploadComplete} onUploadError={handlePDFUploadError} disabled={isSubmitting} />
                  ) : (
                    <div>
                      <PDFPreviewComponent pdfFile={uploadedPDF} onProcessingComplete={handlePDFProcessingComplete} onProcessingError={handlePDFProcessingError} />
                      <button type="button" onClick={clearPDFUpload} disabled={isSubmitting} className="text-sm text-gray-600 hover:text-error">Upload Different PDF</button>
                    </div>
                  )}
                  {errors.pdf && <p className="text-error text-sm">{errors.pdf}</p>}
                </div>
                <div className="lg:col-span-2 space-y-8">
                  <div className={`space-y-6 ${!processedPDFData ? 'opacity-50' : ''}`}>
                    <h3 className="text-xl font-bold text-primary">2. Add Preview Image</h3>
                    <div className="flex justify-center">
                      <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                        <button type="button" onClick={() => handleUploadModeToggle('image')} disabled={isSubmitting} className={`px-4 py-2 rounded-md text-sm ${uploadMode === 'image' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>Upload Image</button>
                        <button type="button" onClick={() => handleUploadModeToggle('url')} disabled={isSubmitting} className={`px-4 py-2 rounded-md text-sm ${uploadMode === 'url' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>Image URL</button>
                      </div>
                    </div>
                    {uploadMode === 'image' && (
                      <div>
                        {!uploadedImage ? (
                          <ImageUploadZone onUploadComplete={handleImageUploadComplete} onUploadError={handleImageUploadError} disabled={isSubmitting || !processedPDFData} />
                        ) : (
                          <div>
                            <p>Image Uploaded: {uploadedImage.fileName}</p>
                            <button type="button" onClick={clearImageUpload} disabled={isSubmitting}>Clear</button>
                          </div>
                        )}
                      </div>
                    )}
                    {uploadMode === 'url' && (
                      <div>
                        <label htmlFor="image">Preview Image URL</label>
                        <input type="url" id="image" name="image" value={formData.image} onChange={handleInputChange} disabled={isSubmitting || !processedPDFData} />
                        {formData.image && <img src={formData.image} alt="Preview" className="w-full max-w-xs h-auto rounded-lg" />}
                      </div>
                    )}
                    {errors.image && <p className="text-error text-sm">{errors.image}</p>}
                  </div>
                  <div className={`space-y-6 ${!processedPDFData || (!processedImageData && !formData.image.trim()) ? 'opacity-50' : ''}`}>
                    <h3 className="text-lg font-semibold text-primary">3. Product Details</h3>
                    <div>
                      <label htmlFor="title">Product Title *</label>
                      <input ref={titleInputRef} type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} disabled={isSubmitting} />
                      {errors.title && <p className="text-error text-sm">{errors.title}</p>}
                    </div>
                    <div>
                      <label htmlFor="description">Description *</label>
                      <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} rows={5} disabled={isSubmitting} />
                      {errors.description && <p className="text-error text-sm">{errors.description}</p>}
                    </div>
                    <div>
                      <label htmlFor="price">Price *</label>
                      <input type="number" id="price" name="price" value={formData.price} onChange={handleInputChange} min="0" step="0.01" disabled={isSubmitting} />
                      {errors.price && <p className="text-error text-sm">{errors.price}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className="p-6 border-t flex items-center justify-end space-x-3">
            <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-6 py-2 border rounded-lg">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting || !processedPDFData || (!processedImageData && !formData.image.trim())} className="px-6 py-3 font-medium rounded-lg bg-primary text-white disabled:opacity-50">
              {isSubmitting ? 'Publishing...' : (mode === 'edit' ? 'Update Product' : 'Publish Product')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
