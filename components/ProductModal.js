import { useState, useEffect, useRef } from 'react';
import PDFUploadZone from './PDFUploadZone';
import ImageUploadZone from './ImageUploadZone';
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
  
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedImageData, setProcessedImageData] = useState(null);
  const [imageProcessingStatus, setImageProcessingStatus] = useState('idle');
  const [imageError, setImageError] = useState(null);
  
  // UI state
  const [uploadMode, setUploadMode] = useState('pdf'); // 'pdf' is primary product, then complementary image
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
        // Determine upload mode based on existing data
        if (editProduct.image_file_id) {
          setUploadMode('image');
        } else if (editProduct.pdf_file_id) {
          setUploadMode('pdf');
        } else if (editProduct.image) {
          setUploadMode('url');
        } else {
          setUploadMode('pdf'); // Default to PDF upload (primary product)
        }
      } else {
        resetForm();
      }
      
      // Focus title input after modal opens
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, mode, editProduct]);

  // Clear errors when processing status changes (defensive handling)
  useEffect(() => {
    if (pdfProcessingStatus === 'processing' || pdfProcessingStatus === 'completed') {
      setErrors(prev => ({ 
        ...prev, 
        pdf: null
      }));
    }
  }, [pdfProcessingStatus]);

  useEffect(() => {
    if (imageProcessingStatus === 'processing' || imageProcessingStatus === 'completed') {
      setErrors(prev => ({ 
        ...prev, 
        image: null
      }));
    }
  }, [imageProcessingStatus]);

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
    
    // Reset PDF state
    setUploadedPDF(null);
    setProcessedPDFData(null);
    setPdfProcessingStatus('idle');
    setPdfError(null);
    
    // Reset image state
    setUploadedImage(null);
    setProcessedImageData(null);
    setImageProcessingStatus('idle');
    setImageError(null);
    
    // Reset UI state
    setUploadMode('pdf');
    setErrors({}); // Clear all errors
    setShowSuccessMessage(false);
    
    // Additional defensive cleanup
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

    // Image upload is now MANDATORY regardless of mode
    if (!processedImageData && !formData.image.trim()) {
      newErrors.image = 'Product image is required - please upload an image or provide a URL';
    }

    // Additional validation for specific modes
    if (uploadMode === 'pdf' && !processedPDFData) {
      newErrors.pdf = 'Please upload and process a PDF file';
    }

    if (uploadMode === 'image' && !processedImageData) {
      newErrors.image = 'Please upload an image file';
    }

    if (uploadMode === 'url' && !formData.image.trim()) {
      newErrors.image = 'Image URL is required';
    }

    // When using PDF mode, require processed PDF data and generated image
    if (uploadMode === 'pdf' && processedPDFData && !formData.image.trim()) {
      newErrors.image = 'PDF processing must generate a preview image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PDF upload handlers
  const handlePDFUploadComplete = (pdfFile) => {
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
    
    // Auto-populate image URL from processed PDF if in PDF mode
    if (processedData.previewUrls?.medium && uploadMode === 'pdf') {
      // Get Supabase URL with fallback for development
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                         (typeof window !== 'undefined' && window.location.origin.includes('localhost') 
                           ? 'https://hminnrncnrquogdwnpan.supabase.co' 
                           : null);
      
      if (supabaseUrl) {
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${processedData.previewUrls.medium}`;
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
    if (uploadMode === 'pdf' && formData.image?.includes('supabase')) {
      setFormData(prev => ({ ...prev, image: '' }));
    }
  };

  // Image upload handlers
  const handleImageUploadComplete = (imageFile) => {
      id: imageFile.id,
      fileName: imageFile.fileName,
      fileSize: imageFile.fileSize,
      dimensions: imageFile.dimensions,
      processingStatus: imageFile.processingStatus
    })
    
    setUploadedImage(imageFile);
    setProcessedImageData(imageFile); // For images, upload and processing are the same step
    setImageProcessingStatus('completed');
    setImageError(null);
    
    // Clear any previous errors
    setErrors(prev => ({ 
      ...prev, 
      image: null,
      submit: null 
    }));
    
    // Auto-populate form fields from image metadata if available and fields are empty
    const updates = {};
    
    if (!formData.title.trim()) {
      // Generate a title from filename
      const baseName = imageFile.fileName?.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '') || 'Digital Artwork';
      updates.title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    // Generate description from image metadata
    if (!formData.description.trim()) {
      const descriptionParts = [];
      
      if (imageFile.dimensions) {
        descriptionParts.push(`High-quality digital image (${imageFile.dimensions.width} × ${imageFile.dimensions.height} pixels)`);
      } else {
        descriptionParts.push('High-quality digital image perfect for printing and digital use');
      }
      
      if (imageFile.colorProfile) {
        descriptionParts.push(`Color profile: ${imageFile.colorProfile}`);
      }
      
      if (descriptionParts.length > 0) {
        updates.description = descriptionParts.join('. ') + '.';
      }
    }
    
    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const handleImageUploadError = (error) => {
    console.error('[PRODUCT-MODAL] Image Upload Error:', error);
    setImageError(error.toString());
    setUploadedImage(null);
    setProcessedImageData(null);
    setImageProcessingStatus('failed');
  };

  const clearImageUpload = () => {
    setUploadedImage(null);
    setProcessedImageData(null);
    setImageProcessingStatus('idle');
    setImageError(null);
  };

  const handleUploadModeToggle = (mode) => {
    setUploadMode(mode);
    
    // Clear data from other modes
    if (mode === 'pdf') {
      // Clear image uploads and URLs
      clearImageUpload();
      setFormData(prev => ({ ...prev, image: '' }));
    } else if (mode === 'image') {
      // Clear PDF uploads and URLs
      clearPDFUpload();
      setFormData(prev => ({ ...prev, image: '' }));
    } else if (mode === 'url') {
      // Clear both uploads
      clearPDFUpload();
      clearImageUpload();
    }
    
    // Clear any upload-related errors
    setErrors(prev => ({ 
      ...prev, 
      pdf: null, 
      image: null,
      submit: null 
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

      // Include Image data if available
      if (processedImageData) {
        productData.imageFileId = processedImageData.id;
        productData.imageData = {
          fileName: processedImageData.fileName,
          fileSize: processedImageData.fileSize,
          dimensions: processedImageData.dimensions,
          imageVariants: processedImageData.imageVariants,
          colorProfile: processedImageData.colorProfile,
          contentType: processedImageData.contentType,
        };
      }

        method, 
        url, 
        uploadMode,
        formData: {
          title: formData.title,
          description: formData.description?.substring(0, 50) + '...',
          price: formData.price,
          image: formData.image?.substring(0, 100)
        }
      })
      
        hasPDF: !!processedPDFData,
        pdfFileId: processedPDFData?.id,
        pdfFileName: processedPDFData?.fileName,
        hasImage: !!processedImageData, 
        imageFileId: processedImageData?.id,
        imageFileName: processedImageData?.fileName,
        imageProcessingStatus: processedImageData?.processingStatus
      })
      
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });


      if (response.ok) {
        const savedProduct = await response.json();
          id: savedProduct.id, 
          title: savedProduct.title,
          hasImageFileId: !!savedProduct.image_file_id,
          imageFileId: savedProduct.image_file_id,
          image: savedProduct.image?.substring(0, 100)
        })
        
        
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

              {/* Two-Column Layout - PDF First (Product), then Image (Preview) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 flex-1 min-h-0 overflow-y-auto">
                
                {/* Left Column: PDF Upload (60%) - Primary Product */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Step 1: Upload Digital Product (PDF) */}
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </div>
                        <h3 className="text-xl font-bold text-primary">Upload Your Digital Artwork</h3>
                      </div>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Upload your PDF file - this is the actual digital product that customers will download.
                      </p>
                    </div>

                    {/* PDF Upload - Always Visible */}

                    {/* PDF Upload - Always Visible */}
                    <div className="space-y-4">
                      {!uploadedPDF && (
                        <PDFUploadZone
                          onUploadComplete={handlePDFUploadComplete}
                          onUploadError={handlePDFUploadError}
                          disabled={isSubmitting}
                        />
                      )}
                      
                      {uploadedPDF && (
                        <div className="space-y-4">
                          <PDFPreviewComponent
                            pdfFile={uploadedPDF}
                            onProcessingComplete={handlePDFProcessingComplete}
                            onProcessingError={handlePDFProcessingError}
                            className="max-h-80"
                          />
                          
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
                  </div>
                </div>

                {/* Right Column: Image Upload + Product Details (40%) */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Step 2: Add Preview Image (Top Half) */}
                  <div className={`space-y-6 transition-all duration-300 ${
                    !processedPDFData ? 'opacity-50' : 'opacity-100'
                  }`}>
                    {/* Step 2 Header */}
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-3 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          processedPDFData 
                            ? (processedImageData || formData.image.trim())
                              ? 'bg-green-500 text-white'
                              : 'bg-primary text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {processedPDFData && (processedImageData || formData.image.trim()) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : '2'}
                        </div>
                        <h3 className="text-xl font-bold text-primary">Add Preview Image</h3>
                      </div>
                      {!processedPDFData ? (
                        <p className="text-gray-500 text-sm">
                          Upload your PDF first to unlock preview options
                        </p>
                      ) : (
                        <p className="text-gray-600 text-sm">
                          Add an image that customers will see before purchasing
                        </p>
                      )}
                    </div>

                    {/* Upload Mode Tabs for Image - Only when PDF is ready */}
                    {processedPDFData && (
                      <div className="flex justify-center">
                        <div className="inline-flex items-center bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setUploadMode('image')}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              uploadMode === 'image'
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            📸 Upload Image
                          </button>
                          <button
                            type="button"
                            onClick={() => setUploadMode('url')}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                              uploadMode === 'url'
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            🔗 Image URL
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image Upload Areas - Only when PDF is ready */}
                    {processedPDFData && (
                      <div className="space-y-4">
                        {/* Image Upload Mode */}
                        {uploadMode === 'image' && (
                          <div className="space-y-4">
                            {!uploadedImage && (
                              <ImageUploadZone
                                onUploadComplete={handleImageUploadComplete}
                                onUploadError={handleImageUploadError}
                                disabled={isSubmitting}
                                showPreview={true}
                                maxFileSize={10 * 1024 * 1024} // 10MB
                              />
                            )}

                            {uploadedImage && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-green-800 font-medium text-sm">Preview image uploaded!</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={clearImageUpload}
                                    disabled={isSubmitting}
                                    className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                                  >
                                    Clear
                                  </button>
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium">File:</span> {uploadedImage.fileName}</p>
                                  <p><span className="font-medium">Size:</span> {Math.round(uploadedImage.fileSize / 1024)} KB</p>
                                  {uploadedImage.dimensions && (
                                    <p><span className="font-medium">Dimensions:</span> {uploadedImage.dimensions.width} × {uploadedImage.dimensions.height} pixels</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Image URL Mode */}
                        {uploadMode === 'url' && (
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
                                Preview Image URL
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
                                placeholder="https://example.com/preview-image.jpg"
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
                                    className="w-full max-w-xs h-auto rounded-lg border border-gray-200 mx-auto"
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
                    )}
                  </div>

                  {/* Step 3: Product Details (Bottom Half) */}
                  <div className={`space-y-6 transition-all duration-300 ${
                    (!processedPDFData || (!processedImageData && !formData.image.trim())) ? 'opacity-50' : 'opacity-100'
                  }`}>
                    {/* Step 3 Header */}
                    <div className="text-center">
                      <div className="inline-flex items-center space-x-3 mb-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          (processedPDFData && (processedImageData || formData.image.trim()))
                            ? (formData.title && formData.description && formData.price)
                              ? 'bg-green-500 text-white'
                              : 'bg-primary text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {(processedPDFData && (processedImageData || formData.image.trim()) && formData.title && formData.description && formData.price) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : '3'}
                        </div>
                        <h3 className="text-lg font-semibold text-primary">Product Details</h3>
                      </div>
                      {(!processedPDFData || (!processedImageData && !formData.image.trim())) ? (
                        <p className="text-gray-500 text-sm">
                          Complete steps 1 & 2 to add product details
                        </p>
                      ) : (
                        <p className="text-gray-600 text-sm">
                          Complete your product information
                        </p>
                      )}
                    </div>

                    {/* Product Details Form */}
                    <div className="space-y-4">
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
                        disabled={isSubmitting || (!processedPDFData || (!processedImageData && !formData.image.trim()))}
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
                        disabled={isSubmitting || (!processedPDFData || (!processedImageData && !formData.image.trim()))}
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
                          disabled={isSubmitting || (!processedPDFData || (!processedImageData && !formData.image.trim()))}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-error text-sm mt-1">{errors.price}</p>
                      )}
                    </div>
                    </div>
                  </div>

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

                  {imageError && (
                    <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-error font-medium text-sm">Image Error: {imageError}</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
            {/* Progress Steps - PDF First Flow */}
            <div className="flex items-center justify-center space-x-6 mb-6">
              {/* Step 1: PDF Upload */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  processedPDFData 
                    ? 'bg-green-500 text-white' 
                    : 'bg-primary text-white'
                }`}>
                  {processedPDFData ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : '1'}
                </div>
                <span className={`text-sm font-medium ${
                  processedPDFData ? 'text-green-600' : 'text-primary'
                }`}>
                  Upload PDF
                </span>
              </div>

              {/* Connector 1 */}
              <div className={`w-10 h-0.5 transition-colors ${
                processedPDFData ? 'bg-green-300' : 'bg-gray-300'
              }`}></div>

              {/* Step 2: Add Preview Image */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  processedPDFData 
                    ? (processedImageData || formData.image.trim())
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {processedPDFData && (processedImageData || formData.image.trim()) ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : '2'}
                </div>
                <span className={`text-sm font-medium ${
                  processedPDFData 
                    ? (processedImageData || formData.image.trim())
                      ? 'text-green-600'
                      : 'text-primary'
                    : 'text-gray-500'
                }`}>
                  Add Image
                </span>
              </div>

              {/* Connector 2 */}
              <div className={`w-10 h-0.5 transition-colors ${
                processedPDFData && (processedImageData || formData.image.trim()) ? 'bg-green-300' : 'bg-gray-300'
              }`}></div>

              {/* Step 3: Complete Details */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  processedPDFData && (processedImageData || formData.image.trim())
                    ? (formData.title && formData.description && formData.price)
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {processedPDFData && (processedImageData || formData.image.trim()) && (formData.title && formData.description && formData.price) ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : '3'}
                </div>
                <span className={`text-sm font-medium ${
                  processedPDFData && (processedImageData || formData.image.trim())
                    ? (formData.title && formData.description && formData.price)
                      ? 'text-green-600'
                      : 'text-primary'
                    : 'text-gray-500'
                }`}>
                  Add Details
                </span>
              </div>

              {/* Connector 3 */}
              <div className={`w-10 h-0.5 transition-colors ${
                processedPDFData && (processedImageData || formData.image.trim()) && (formData.title && formData.description && formData.price)
                  ? 'bg-green-300' : 'bg-gray-300'
              }`}></div>

              {/* Step 4: Publish */}
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  processedPDFData && (processedImageData || formData.image.trim()) && (formData.title && formData.description && formData.price)
                    ? 'bg-primary text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  4
                </div>
                <span className={`text-sm font-medium ${
                  processedPDFData && (processedImageData || formData.image.trim()) && (formData.title && formData.description && formData.price)
                    ? 'text-primary'
                    : 'text-gray-500'
                }`}>
                  Publish
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {!processedPDFData ? (
                  <span>Step 1: Upload your PDF file to get started</span>
                ) : (!processedImageData && !formData.image.trim()) ? (
                  <span>Step 2: Add a preview image for customers</span>
                ) : !(formData.title && formData.description && formData.price) ? (
                  <span>Step 3: Complete product details to continue</span>
                ) : (
                  <span>Ready to publish your product!</span>
                )}
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
                disabled={
                  isSubmitting || 
                  pdfProcessingStatus === 'processing' || 
                  imageProcessingStatus === 'processing' ||
                  !processedPDFData || // Cannot submit without PDF
                  (!processedImageData && !formData.image.trim()) || // Cannot submit without image
                  !(formData.title && formData.description && formData.price) // Cannot submit without complete details
                }
                className={`px-6 py-3 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center space-x-2 shadow-sm hover:shadow-md min-h-[44px] text-white ${
                  !processedPDFData 
                    ? 'bg-gray-400 cursor-not-allowed'
                    : (!processedImageData && !formData.image.trim()) 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : !(formData.title && formData.description && formData.price)
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-primary hover:from-blue-700 hover:to-primary-dark transform hover:scale-105'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Publishing...</span>
                  </>
                ) : !processedPDFData ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21H17l-10-9h20v6M7 3v6l10 9H7V3z" />
                    </svg>
                    <span>Upload PDF to Continue</span>
                  </>
                ) : (!processedImageData && !formData.image.trim()) ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Add Image to Continue</span>
                  </>
                ) : !(formData.title && formData.description && formData.price) ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Complete Details</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{mode === 'edit' ? 'Update Product' : 'Publish Product'}</span>
                  </>
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;