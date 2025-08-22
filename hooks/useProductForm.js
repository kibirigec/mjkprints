import { useState, useEffect, useRef } from 'react';

export const useProductForm = ({ mode, editProduct, onSave, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({ title: '', description: '', price: '', image: '' });
  const [uploadedPDF, setUploadedPDF] = useState(null);
  const [processedPDFData, setProcessedPDFData] = useState(null);
  const [pdfProcessingStatus, setPdfProcessingStatus] = useState('idle');
  const [pdfError, setPdfError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedImageData, setProcessedImageData] = useState(null);
  const [imageProcessingStatus, setImageProcessingStatus] = useState('idle');
  const [imageError, setImageError] = useState(null);
  const [uploadMode, setUploadMode] = useState('pdf');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const titleInputRef = useRef(null);

  const initializeState = (product) => {
    setFormData({
      title: product?.title || '',
      description: product?.description || '',
      price: product?.price?.toString() || '',
      image: product?.image || ''
    });
    if (product?.image_file_id) setUploadMode('image');
    else if (product?.pdf_file_id) setUploadMode('pdf');
    else if (product?.image) setUploadMode('url');
    else setUploadMode('pdf');
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', price: '', image: '' });
    setUploadedPDF(null);
    setProcessedPDFData(null);
    setPdfProcessingStatus('idle');
    setPdfError(null);
    setUploadedImage(null);
    setProcessedImageData(null);
    setImageProcessingStatus('idle');
    setImageError(null);
    setUploadMode('pdf');
    setErrors({});
    setShowSuccessMessage(false);
  };

  useEffect(() => {
    if (mode === 'edit' && editProduct) {
      initializeState(editProduct);
    } else {
      resetForm();
    }
  }, [mode, editProduct]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!processedImageData && !formData.image.trim()) newErrors.image = 'Product image is required';
    if (uploadMode === 'pdf' && !processedPDFData) newErrors.pdf = 'Please upload and process a PDF file';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePDFUploadComplete = (pdfFile) => {
    setUploadedPDF(pdfFile);
    setPdfProcessingStatus('idle');
    setPdfError(null);
    setErrors(prev => ({ ...prev, pdf: null, image: null, submit: null }));
    const updates = {};
    if (pdfFile.metadata?.title && !formData.title.trim()) {
      updates.title = pdfFile.metadata.title;
    } else if (!formData.title.trim()) {
      const baseName = pdfFile.fileName?.replace(/\.pdf$/i, '') || 'Digital Artwork';
      updates.title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!formData.description.trim()) {
      const descriptionParts = [];
      if (pdfFile.metadata?.subject) descriptionParts.push(pdfFile.metadata.subject);
      if (pdfFile.pageCount) descriptionParts.push(`This digital artwork contains ${pdfFile.pageCount} page${pdfFile.pageCount !== 1 ? 's' : ''}.`);
      if (descriptionParts.length > 0) updates.description = descriptionParts.join(' ').trim();
    }
    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
  };

  const handlePDFProcessingComplete = (processedData) => {
    setProcessedPDFData(processedData);
    setPdfProcessingStatus('completed');
    setPdfError(null);
    setErrors(prev => ({ ...prev, pdf: null, image: null, submit: null }));
    if (processedData.previewUrls?.medium && uploadMode === 'pdf') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        const imageUrl = `${supabaseUrl}/storage/v1/object/public/mjk-prints-storage/${processedData.previewUrls.medium}`;
        setFormData(prev => ({ ...prev, image: imageUrl }));
      }
    }
  };

  const handleImageUploadComplete = (imageFile) => {
    setUploadedImage(imageFile);
    setProcessedImageData(imageFile);
    setImageProcessingStatus('completed');
    setImageError(null);
    setErrors(prev => ({ ...prev, image: null, submit: null }));

    // NEW: Update formData.image with the public URL of the uploaded image
    if (imageFile && imageFile.publicUrl) {
      setFormData(prev => ({ ...prev, image: imageFile.publicUrl }));
    }
    const updates = {};
    if (!formData.title.trim()) {
      const baseName = imageFile.fileName?.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '') || 'Digital Artwork';
      updates.title = baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!formData.description.trim()) {
      const desc = imageFile.dimensions ? `High-quality digital image (${imageFile.dimensions.width} × ${imageFile.dimensions.height} pixels).` : 'High-quality digital image.';
      updates.description = desc;
    }
    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    const productData = { ...formData, price: parseFloat(formData.price) };
    if (processedPDFData) productData.pdfFileId = processedPDFData.id;
    if (processedImageData) productData.imageFileId = processedImageData.id;

    try {
      const url = mode === 'edit' && editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const savedProduct = await response.json();
        setErrors({});
        setShowSuccessMessage(true);
        if (onSave) onSave(savedProduct);
        if (onSuccess) onSuccess(savedProduct);
        setTimeout(() => { onClose(); resetForm(); }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save product (${response.status})`);
      }
    } catch (error) {
      if (!showSuccessMessage) {
        setErrors({ submit: error.message || 'Error saving product' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData, setFormData,
    uploadedPDF, setUploadedPDF,
    processedPDFData, setProcessedPDFData,
    pdfProcessingStatus, setPdfProcessingStatus,
    pdfError, setPdfError,
    uploadedImage, setUploadedImage,
    processedImageData, setProcessedImageData,
    imageProcessingStatus, setImageProcessingStatus,
    imageError, setImageError,
    uploadMode, setUploadMode,
    isSubmitting, setIsSubmitting,
    errors, setErrors,
    showSuccessMessage, setShowSuccessMessage,
    titleInputRef,
    handleInputChange,
    validateForm,
    handlePDFUploadComplete,
    handlePDFUploadError: (error) => {
      setPdfError(error.toString());
      setPdfProcessingStatus('failed');
    },
    handlePDFProcessingComplete,
    handlePDFProcessingError: (error) => {
      setPdfError(error.toString());
      setPdfProcessingStatus('failed');
    },
    clearPDFUpload: () => {
      setUploadedPDF(null);
      setProcessedPDFData(null);
      setPdfProcessingStatus('idle');
      setPdfError(null);
    },
    handleImageUploadComplete,
    handleImageUploadError: (error) => {
      setImageError(error.toString());
      setImageProcessingStatus('failed');
    },
    clearImageUpload: () => {
      setUploadedImage(null);
      setProcessedImageData(null);
      setImageProcessingStatus('idle');
      setImageError(null);
    },
    handleUploadModeToggle: (mode) => {
      setUploadMode(mode);
      setErrors(prev => ({ ...prev, pdf: null, image: null, submit: null }));
    },
    handleSubmit,
    resetForm
  };
};
