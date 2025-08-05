import { useState, useEffect, useRef } from 'react';
import PDFUploadZone from './PDFUploadZone';
import PDFPreviewComponent from './PDFPreviewComponent';

const ProductModal = ({ 
  isOpen, 
  onClose, 
  mode = 'add', 
  editProduct = null, 
  onSave, 
  onSuccess 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    image: ''
  });
  
  // PDF upload state
  const [uploadedPDF, setUploadedPDF] = useState(null);
  const [processedPDFData, setProcessedPDFData] = useState(null);
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState('idle');
  const [pdfError, setPdfError] = useState(null);
  
  // UI state
  const [useImageUrl, setUseImageUrl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Refs
  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  // Initialize form data when editing
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && editProduct) {
        setFormData({
          title: editProduct.title || '',
          description: editProduct.description || '',
          price: editProduct.price?.toString() || '',
          image: editProduct.image || ''
        });
        setUseImageUrl(!!editProduct.image && !editProduct.pdfData);
      } else {
        resetForm();
      }
      
      // Focus title input after modal opens
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode, editProduct]);

  // Clear errors when PDF processing status changes (defensive handling)
  useEffect(() => {
    if (pdfProcessingStatus === 'processing' || pdfProcessingStatus === 'completed') {
      setErrors(prev => ({ 
        ...prev, 
        pdf: null, 
        image: null 
      }));
    }
  }, [pdfProcessingStatus]);

  // Handle ESC key and outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', image: '' });
    setUploadedPDF(null);
    setProcessedPDFData(null);
    setPdfProcessingStatus('idle');
    setPdfError(null);
    setUseImageUrl(false);
    setErrors({}); // Clear all errors
    setShowSuccessMessage(false);
    
    // Additional defensive cleanup
    console.log('[PRODUCT-MODAL] Form reset completed');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!useImageUrl && !processedPDFData) {
      newErrors.pdf = 'Please upload and process a PDF, or switch to Image URL mode';
    }

    if (useImageUrl && !formData.image.trim()) {
      newErrors.image = 'Image URL is required when not using PDF upload';
    }

    // When using PDF mode, require processed PDF data and generated image
    if (!useImageUrl && processedPDFData && !formData.image.trim()) {
      newErrors.image = 'PDF processing must generate a preview image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PDF upload handlers
  const handlePDFUploadComplete = (pdfFile) => {
    console.log('[PRODUCT-MODAL] PDF upload completed:', pdfFile.fileName);
    setUploadedPDF(pdfFile);
    setPdfProcessingStatus('idle'); // Set to 'idle' so PDFPreviewComponent can start processing
    setPdfError(null);
    
    // Clear any previous errors including validation errors
    setErrors(prev => ({ 
      ...prev, 
      pdf: null, 
      image: null,
      submit: null 
    }));
    
    // Auto-populate form fields from PDF metadata if available and fields are empty
    const updates = {};
    
    if (pdfFile.metadata?.title && !formData.title.trim()) {
      updates.title = pdfFile.metadata.title;
    } else if (!formData.title.trim()) {
      // Generate a fallback title from filename if no metadata title is available
      const baseName = pdfFile.fileName?.replace(/\.pdf$/i, '') || 'Digital Artwork';
      updates.title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Generate description from available metadata
    if (!formData.description.trim()) {
      const descriptionParts = [];
      
      if (pdfFile.metadata?.subject) {
        descriptionParts.push(pdfFile.metadata.subject);
      }
      
      if (pdfFile.metadata?.textContent && pdfFile.metadata.textContent.length > 50) {
        // Use first sentence or first 100 characters of text content
        const firstSentence = pdfFile.metadata.textContent.split('.')[0];
        if (firstSentence.length > 20 && firstSentence.length < 200) {
          descriptionParts.push(firstSentence + '.');
        }
      }
      
      // Add page count info
      if (pdfFile.pageCount) {
        descriptionParts.push(`This digital artwork contains ${pdfFile.pageCount} page${pdfFile.pageCount !== 1 ? 's' : ''}.`);
      }
      
      if (descriptionParts.length > 0) {
        updates.description = descriptionParts.join(' ').trim();
      } else {
        // Fallback description
        updates.description = `Digital artwork from PDF file "${pdfFile.fileName}". High-quality printable design perfect for home or office decoration.`;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
    
    // Clear PDF error if it exists
    if (errors.pdf) {
      setErrors(prev => ({ ...prev, pdf: null }));
    }
  };

  const handlePDFUploadError = (error) => {
    console.error('[PRODUCT-MODAL] PDF Upload Error:', error);
    setPdfError(error.toString());
    setUploadedPDF(null);
    setPdfProcessingStatus('failed');
  };

  const handlePDFProcessingComplete = (processedData) => {
    console.log('[PRODUCT-MODAL] PDF processing completed:', processedData.fileName);
    setProcessedPDFData(processedData);
    setPdfProcessingStatus('completed');
    setPdfError(null);
    
    // Clear any processing-related errors
    setErrors(prev => ({ 
      ...prev, 
      pdf: null, 
      image: null,
      submit: null 
    }));
    
    // Auto-populate image URL from processed PDF if not using manual image URL
    if (processedData.previewUrls?.medium && !useImageUrl) {
      // Get Supabase URL with fallback for development
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         (typeof window !== 'undefined' && window.location.origin.includes('localhost') 
                           ? 'https://hminnrncnrquogdwnpan.supabase.co' 
                           : null);
      
      if (supabaseUrl) {
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${processedData.previewUrls.medium}`;
        console.log('[PRODUCT-MODAL] Setting image URL:', imageUrl);
        setFormData(prev => ({ ...prev, image: imageUrl }));
      } else {
        console.warn('[PRODUCT-MODAL] Cannot set image URL - Supabase URL not available');
      }
    }
    
    // Auto-populate additional fields from processed PDF metadata if available
    const updates = {};
    
    // Update title if we have better metadata from processing and title is still empty or from filename
    if (processedData.metadata?.title && 
        (!formData.title.trim() || formData.title === uploadedPDF?.fileName?.replace('.pdf', ''))) {
      updates.title = processedData.metadata.title;
    }
    
    // Update description with processing metadata if current description is auto-generated
    if (processedData.metadata?.subject && 
        formData.description.includes('Digital artwork from PDF file')) {
      const descriptionParts = [processedData.metadata.subject];
      if (processedData.pageCount) {
        descriptionParts.push(`This digital artwork contains ${processedData.pageCount} page${processedData.pageCount !== 1 ? 's' : ''}.`);
      }
      descriptionParts.push('High-quality printable design perfect for home or office decoration.');
      updates.description = descriptionParts.join(' ');
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
    
    // Clear PDF and image errors if they exist
    if (errors.pdf || errors.image) {
      setErrors(prev => ({ ...prev, pdf: null, image: null }));
    }
  };

  const handlePDFProcessingError = (error) => {
    console.error('[PRODUCT-MODAL] PDF Processing Error:', error);
    setPdfError(error.toString());
    setPdfProcessingStatus('failed');
  };

  const clearPDFUpload = () => {
    setUploadedPDF(null);
    setProcessedPDFData(null);
    setPdfProcessingStatus('idle');
    setPdfError(null);
    
    // Clear auto-generated image URL
    if (!useImageUrl && formData.image?.includes('supabase')) {
      setFormData(prev => ({ ...prev, image: '' }));
    }
  };

  const handleUploadModeToggle = (usePdfMode) => {
    setUseImageUrl(!usePdfMode);
    
    if (usePdfMode) {
      // Switching to PDF mode - clear manual image URL
      setFormData(prev => ({ ...prev, image: '' }));
    } else {
      // Switching to image URL mode - clear PDF data
      clearPDFUpload();
    }
    
    // Clear related errors
    setErrors(prev => ({ 
      ...prev, 
      pdf: null, 
      image: null 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    // Move productData declaration outside try-catch to fix scoping
    const productData = {
      ...formData,
      price: parseFloat(formData.price),
    };

    try {
      const url = mode === 'edit' && editProduct 
        ? `/api/products/${editProduct.id}` 
        : '/api/products';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      // Include PDF data if available
      if (processedPDFData) {
        productData.pdfFileId = processedPDFData.id;
        productData.pdfData = {
          fileName: processedPDFData.fileName,
          fileSize: processedPDFData.fileSize,
          pageCount: processedPDFData.pageCount,
          dimensions: processedPDFData.dimensions,
          previewUrls: processedPDFData.previewUrls,
          thumbnailUrls: processedPDFData.thumbnailUrls,
          processingStatus: processedPDFData.processingStatus,
        };
      }

      console.log('[PRODUCT-MODAL] Submitting product:', { method, url, hasPDF: !!processedPDFData });
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      console.log('[PRODUCT-MODAL] API response status:', response.status, response.statusText);

      if (response.ok) {
        const savedProduct = await response.json();
        console.log('[PRODUCT-MODAL] Product saved successfully:', { id: savedProduct.id, title: savedProduct.title });
        
        // Clear any previous errors
        setErrors({});
        
        // Show success message
        setShowSuccessMessage(true);
        
        // Call success callbacks
        if (onSave) {
          onSave(savedProduct);
        }
        if (onSuccess) {
          onSuccess(savedProduct);
        }
        
        // Close modal after a brief delay
        setTimeout(() => {
          handleClose();
        }, 1500);
        
      } else {
        // Parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('[PRODUCT-MODAL] Failed to parse error response:', parseError);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.error('[PRODUCT-MODAL] API error response:', errorData);
        throw new Error(errorData.error || errorData.details || `Failed to save product (${response.status})`);
      }
    } catch (error) {
      console.error('[PRODUCT-MODAL] Submit Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        productData: { title: productData.title, hasPDF: !!processedPDFData }
      });
      
      // Set error for display but don't override success state
      if (!showSuccessMessage) {
        setErrors({ submit: error.message || 'Error saving product' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        style={{ backdropFilter: 'blur(4px)' }}
      />
      
      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          ref={modalRef}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] max-h-[95vh] sm:h-[90vh] sm:max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100 flex flex-col"
          style={{ width: '95vw' }}
        >
          {/* Success Overlay */}
          {showSuccessMessage && (
            <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-success">
                    {mode === 'edit' ? 'Product Updated!' : 'Product Added!'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {mode === 'edit' ? 'Your changes have been saved.' : 'Your new product has been created.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {mode === 'edit' ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-gray-600 mt-1">
                {mode === 'edit' 
                  ? 'Update your product information and settings'
                  : 'Create a new digital art product for your store'
                }
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              {/* General Error */}
              {errors.submit && (
                <div className="mx-6 mt-6 bg-error/10 border border-error/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-error font-medium">{errors.submit}</p>
                  </div>
                </div>
              )}

              {/* Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 flex-1 min-h-0 overflow-y-auto">
                
                {/* Left Column: Product Details Form (60%) */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Product Details</h3>
                    
                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Product Title *
                      </label>
                      <input
                        ref={titleInputRef}
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                          errors.title ? 'border-error' : 'border-gray-300'
                        }`}
                        placeholder="Enter a descriptive title for your artwork"
                        disabled={isSubmitting}
                      />
                      {errors.title && (
                        <p className="text-error text-sm mt-1">{errors.title}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={5}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none ${
                          errors.description ? 'border-error' : 'border-gray-300'
                        }`}
                        placeholder="Describe your artwork, its style, dimensions, and what makes it special..."
                        disabled={isSubmitting}
                      />
                      {errors.description && (
                        <p className="text-error text-sm mt-1">{errors.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-lg">$</span>
                        </div>
                        <input
                          type="number"
                          id="price"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          min="0"
                          step="0.01"
                          className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                            errors.price ? 'border-error' : 'border-gray-300'
                          }`}
                          placeholder="0.00"
                          disabled={isSubmitting}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-error text-sm mt-1">{errors.price}</p>
                      )}
                    </div>
                  </div>

                  {/* Image URL Mode (only show in left column when using image URL) */}
                  {useImageUrl && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary">Product Image</h3>
                      <div>
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                          Image URL *
                        </label>
                        <input
                          type="url"
                          id="image"
                          name="image"
                          value={formData.image}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                            errors.image ? 'border-error' : 'border-gray-300'
                          }`}
                          placeholder="https://example.com/image.jpg"
                          disabled={isSubmitting}
                        />
                        {errors.image && (
                          <p className="text-error text-sm mt-1">{errors.image}</p>
                        )}
                        {formData.image && (
                          <div className="mt-3">
                            <img
                              src={formData.image}
                              alt="Preview"
                              className="w-full max-w-xs h-auto rounded-lg border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Upload Section (40%) */}
                <div className="lg:col-span-2 space-y-6 flex flex-col min-h-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-primary">Upload</h3>
                      
                      {/* Upload Mode Toggle */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleUploadModeToggle(true)}
                          disabled={isSubmitting}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            !useImageUrl 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUploadModeToggle(false)}
                          disabled={isSubmitting}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            useImageUrl 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          URL
                        </button>
                      </div>
                    </div>

                    {/* PDF Upload Mode */}
                    {!useImageUrl && (
                      <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                        {!uploadedPDF && (
                          <PDFUploadZone
                            onUploadComplete={handlePDFUploadComplete}
                            onUploadError={handlePDFUploadError}
                            disabled={isSubmitting}
                          />
                        )}
                        
                        {uploadedPDF && (
                          <div className="space-y-4 max-h-80 sm:max-h-96 overflow-y-auto">
                            <PDFPreviewComponent
                              pdfFile={uploadedPDF}
                              onProcessingComplete={handlePDFProcessingComplete}
                              onProcessingError={handlePDFProcessingError}
                              className="max-h-80"
                            />
                            
                            {/* Clear PDF button */}
                            <button
                              type="button"
                              onClick={clearPDFUpload}
                              disabled={isSubmitting}
                              className="text-sm text-gray-600 hover:text-error transition-colors"
                            >
                              Upload Different PDF
                            </button>
                          </div>
                        )}
                        
                        {errors.pdf && (
                          <p className="text-error text-sm">{errors.pdf}</p>
                        )}
                      </div>
                    )}

                    {/* URL Mode Hint */}
                    {useImageUrl && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-blue-700 text-sm font-medium">Using Image URL Mode</p>
                            <p className="text-blue-600 text-xs mt-1">
                              Enter the image URL in the Product Details section on the left.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Processing Status */}
                    {pdfError && (
                      <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-error font-medium text-sm">PDF Error: {pdfError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="text-sm text-gray-600">
              {mode === 'edit' ? 'Update your product information' : 'All fields marked with * are required'}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!useImageUrl && pdfProcessingStatus === 'processing')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2 shadow-sm hover:shadow-md min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{mode === 'edit' ? 'Update Product' : 'Add Product'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;