import { useEffect, useRef, useState } from 'react';
import { useProductForm } from '../hooks/useProductForm';
import PDFUploadZone from './PDFUploadZone';
import ImageUploadZone from './ImageUploadZone';
import PDFPreviewComponent from './PDFPreviewComponent';

const ProductModal = ({ isOpen, onClose, mode = 'add', editProduct, onSave, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
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
  const totalSteps = 3;

  // Check step completion
  useEffect(() => {
    const newCompletedSteps = new Set();
    
    if (processedPDFData) {
      newCompletedSteps.add(1);
    }
    
    if (processedImageData || formData.image.trim()) {
      newCompletedSteps.add(2);
    }
    
    if (formData.title.trim() && formData.description.trim() && formData.price) {
      newCompletedSteps.add(3);
    }
    
    setCompletedSteps(newCompletedSteps);
  }, [processedPDFData, processedImageData, formData]);

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentStep(1);
      setCompletedSteps(new Set());
      onClose();
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step) => {
    // Allow clicking on completed steps or the current step
    if (completedSteps.has(step - 1) || step === 1) {
      setCurrentStep(step);
    }
  };

  const isStepAccessible = (step) => {
    if (step === 1) return true;
    if (step === 2) return completedSteps.has(1);
    if (step === 3) return completedSteps.has(2);
    return false;
  };

  const canProceedToNext = () => {
    if (currentStep === 1) return processedPDFData;
    if (currentStep === 2) return processedImageData || formData.image.trim();
    return false;
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setCurrentStep(1);
      setCompletedSteps(new Set());
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

  const stepTitles = [
    "Upload Digital Artwork",
    "Add Preview Image", 
    "Product Details"
  ];

  const stepDescriptions = [
    "Upload your PDF artwork file",
    "Add a preview image for your product",
    "Fill in your product information"
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
      
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 lg:p-6">
        <div 
          ref={modalRef} 
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
        >
          {/* Success overlay */}
          {showSuccessMessage && (
            <div className="absolute inset-0 bg-white bg-opacity-95 backdrop-blur-xl flex items-center justify-center z-50 rounded-2xl">
              <div className="text-center space-y-6 p-8">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">
                  {mode === 'edit' ? 'Product Updated!' : 'Product Published!'}
                </h3>
                <p className="text-gray-600">Your product is now live and ready for customers</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between p-6 sm:p-8">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {mode === 'edit' ? 'Edit Product' : 'Create New Product'}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                </p>
              </div>
              <button 
                onClick={handleClose} 
                disabled={isSubmitting}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200 disabled:opacity-50"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 sm:px-8 pb-6">
              <div className="flex items-center justify-between">
                {Array.from({ length: totalSteps }, (_, i) => {
                  const step = i + 1;
                  const isCompleted = completedSteps.has(step);
                  const isCurrent = currentStep === step;
                  const isAccessible = isStepAccessible(step);
                  
                  return (
                    <div key={step} className="flex items-center flex-1">
                      <button
                        onClick={() => handleStepClick(step)}
                        disabled={!isAccessible}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                          isCompleted 
                            ? 'bg-green-500 text-white' 
                            : isCurrent 
                            ? 'bg-blue-500 text-white' 
                            : isAccessible
                            ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          step
                        )}
                      </button>
                      
                      {step < totalSteps && (
                        <div className={`flex-1 h-1 mx-4 rounded ${
                          completedSteps.has(step) ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-center">
                <h3 className="text-lg font-semibold text-gray-900">{stepTitles[currentStep - 1]}</h3>
                <p className="text-gray-600 text-sm">{stepDescriptions[currentStep - 1]}</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8">
              {errors.submit && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{errors.submit}</p>
                </div>
              )}

              {/* Step 1: PDF Upload */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="max-w-2xl mx-auto">
                    {!uploadedPDF ? (
                      <PDFUploadZone 
                        onUploadComplete={handlePDFUploadComplete} 
                        onUploadError={handlePDFUploadError} 
                        disabled={isSubmitting}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                          <PDFPreviewComponent 
                            pdfFile={uploadedPDF} 
                            onProcessingComplete={handlePDFProcessingComplete} 
                            onProcessingError={handlePDFProcessingError}
                          />
                        </div>
                        <div className="text-center">
                          <button 
                            type="button" 
                            onClick={clearPDFUpload} 
                            disabled={isSubmitting}
                            className="text-sm text-gray-600 hover:text-red-600 transition-colors duration-200 font-medium"
                          >
                            Upload Different PDF
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {errors.pdf && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm font-medium">{errors.pdf}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Image Upload */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Toggle buttons */}
                    <div className="flex justify-center">
                      <div className="inline-flex bg-gray-100 p-1 rounded-lg">
                        <button 
                          type="button" 
                          onClick={() => handleUploadModeToggle('image')} 
                          disabled={isSubmitting}
                          className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                            uploadMode === 'image' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Upload Image
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleUploadModeToggle('url')} 
                          disabled={isSubmitting}
                          className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                            uploadMode === 'url' 
                              ? 'bg-white text-blue-600 shadow-sm' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                    </div>

                    {uploadMode === 'image' && (
                      <div>
                        {!uploadedImage ? (
                          <ImageUploadZone 
                            onUploadComplete={handleImageUploadComplete} 
                            onUploadError={handleImageUploadError} 
                            disabled={isSubmitting}
                          />
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center space-y-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <p className="font-medium text-gray-900">{uploadedImage.fileName}</p>
                            <button 
                              type="button" 
                              onClick={clearImageUpload} 
                              disabled={isSubmitting}
                              className="text-sm text-gray-600 hover:text-red-600 transition-colors"
                            >
                              Remove and upload different image
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {uploadMode === 'url' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="image" className="block text-sm font-semibold text-gray-700 mb-2">
                            Preview Image URL
                          </label>
                          <input 
                            type="url" 
                            id="image" 
                            name="image" 
                            value={formData.image} 
                            onChange={handleInputChange} 
                            disabled={isSubmitting}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>
                        {formData.image && (
                          <div className="rounded-lg overflow-hidden border border-gray-200">
                            <img 
                              src={formData.image} 
                              alt="Preview" 
                              className="w-full max-h-64 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {errors.image && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm font-medium">{errors.image}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Product Details */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                        Product Title *
                      </label>
                      <input 
                        ref={titleInputRef}
                        type="text" 
                        id="title" 
                        name="title" 
                        value={formData.title} 
                        onChange={handleInputChange} 
                        disabled={isSubmitting}
                        placeholder="Enter a compelling product title"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-2 font-medium">{errors.title}</p>}
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea 
                        id="description" 
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        rows={6} 
                        disabled={isSubmitting}
                        placeholder="Describe your product in detail..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-2 font-medium">{errors.description}</p>}
                    </div>

                    <div>
                      <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                        <input 
                          type="number" 
                          id="price" 
                          name="price" 
                          value={formData.price} 
                          onChange={handleInputChange} 
                          min="0" 
                          step="0.01" 
                          disabled={isSubmitting}
                          placeholder="0.00"
                          className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                      </div>
                      {errors.price && <p className="text-red-500 text-sm mt-2 font-medium">{errors.price}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-500">
                Step {currentStep} of {totalSteps}
              </div>
              
              <div className="flex space-x-3">
                {currentStep > 1 && (
                  <button 
                    type="button" 
                    onClick={handlePrevStep} 
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>
                )}
                
                <button 
                  type="button" 
                  onClick={handleClose} 
                  disabled={isSubmitting}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                
                {currentStep < totalSteps ? (
                  <button 
                    type="button" 
                    onClick={handleNextStep} 
                    disabled={!canProceedToNext() || isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Step
                  </button>
                ) : (
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !completedSteps.has(1) || !completedSteps.has(2) || !completedSteps.has(3)}
                    className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Publishing...</span>
                      </span>
                    ) : (
                      mode === 'edit' ? 'Update Product' : 'Publish Product'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;