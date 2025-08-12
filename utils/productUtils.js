/**
 * Utility functions for handling different product types (PDF vs Image)
 */
import { getFirstPreviewUrl, hasValidPreviewUrls } from './previewUtils'

/**
 * Normalize product data structure to ensure consistent access to file information
 * Handles both file_info and file_uploads formats
 * @param {Object} product - Product object
 * @returns {Object} - Normalized product object with file_info structure
 */
export function normalizeProductData(product) {
  if (!product) return null
  
  // Create normalized product object
  const normalized = { ...product }
  
  // If product has file_uploads but no file_info, transform it
  if (product.file_uploads && !product.file_info) {
    normalized.file_info = {
      preview_urls: product.file_uploads.preview_urls,
      thumbnail_urls: product.file_uploads.thumbnail_urls,
      page_count: product.file_uploads.page_count,
      dimensions: product.file_uploads.dimensions,
      processing_status: product.file_uploads.processing_status,
      file_name: product.file_uploads.file_name,
      file_size: product.file_uploads.file_size
    }
  }
  
  return normalized
}

/**
 * Batch normalize multiple products
 * @param {Array} products - Array of product objects
 * @returns {Array} - Array of normalized product objects
 */
export function normalizeProductList(products) {
  if (!Array.isArray(products)) return []
  return products.map(normalizeProductData).filter(Boolean)
}

/**
 * Check if a product is a PDF product
 * @param {Object} product - Product object
 * @returns {boolean} - True if product has PDF file
 */
export function isPDFProduct(product) {
  return !!(product?.pdf_file_id || product?.page_count > 0)
}

/**
 * Check if a product is an image-only product
 * @param {Object} product - Product object
 * @returns {boolean} - True if product is image-only
 */
export function isImageProduct(product) {
  return !isPDFProduct(product) && !!product?.image
}

/**
 * Get the product type as a string
 * @param {Object} product - Product object
 * @returns {string} - 'pdf' or 'image'
 */
export function getProductType(product) {
  return isPDFProduct(product) ? 'pdf' : 'image'
}


/**
 * Get the best available image variant for a given size preference
 * @param {Object} product - Product object
 * @param {string} sizePreference - Preferred size ('small', 'medium', 'large', 'original')
 * @returns {Object|null} - Image variant object with url, width, height
 */
export function getProductImageVariant(product, sizePreference = 'medium') {
  if (!product?.image_file_id) return null
  
  const imageFileInfo = product?.file_info || product?.file_uploads
  if (!imageFileInfo?.image_variants) return null
  
  const variants = imageFileInfo.image_variants
  
  // Try the requested size first
  if (variants[sizePreference]) {
    return variants[sizePreference]
  }
  
  // Fallback order based on requested size
  const fallbackOrder = {
    small: ['small', 'medium', 'large', 'original'],
    medium: ['medium', 'large', 'small', 'original'],
    large: ['large', 'medium', 'original', 'small'],
    original: ['original', 'large', 'medium', 'small']
  }
  
  const order = fallbackOrder[sizePreference] || fallbackOrder.medium
  
  for (const size of order) {
    if (variants[size]) {
      return variants[size]
    }
  }
  
  return null
}

/**
 * Get formatted page count text for display
 * @param {number} pageCount - Number of pages
 * @returns {string} - Formatted page count (e.g., "12 pages", "1 page")
 */
export function formatPageCount(pageCount) {
  if (!pageCount || pageCount <= 0) return ''
  return pageCount === 1 ? '1 page' : `${pageCount} pages`
}

/**
 * Get preview page limit for a product
 * @param {Object} product - Product object
 * @returns {number} - Number of preview pages allowed
 */
export function getPreviewPageLimit(product) {
  return product?.preview_pages || 3
}

/**
 * Check if product has preview pages available
 * @param {Object} product - Product object
 * @returns {boolean} - True if preview pages are available
 */
export function hasPreviewPages(product) {
  if (!isPDFProduct(product)) return false
  
  // Use centralized utility for consistent validation with both formats
  const fileInfo = product?.file_info || product?.file_uploads
  return hasValidPreviewUrls(fileInfo?.preview_urls)
}

/**
 * Get the file processing status
 * @param {Object} product - Product object
 * @returns {string} - Processing status ('completed', 'processing', 'failed', etc.)
 */
export function getFileProcessingStatus(product) {
  return product?.file_info?.processing_status || 'unknown'
}

/**
 * Check if file processing is complete
 * @param {Object} product - Product object
 * @returns {boolean} - True if processing is complete
 */
export function isFileProcessingComplete(product) {
  return getFileProcessingStatus(product) === 'completed'
}

/**
 * Get file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get product file information for display
 * @param {Object} product - Product object
 * @returns {Object} - File information object
 */
export function getProductFileInfo(product) {
  const fileInfo = product?.file_info || {}
  
  return {
    fileName: fileInfo.file_name || 'Unknown',
    fileSize: formatFileSize(fileInfo.file_size),
    processingStatus: fileInfo.processing_status || 'unknown',
    isProcessingComplete: fileInfo.processing_status === 'completed',
    dimensions: fileInfo.dimensions || null,
    pageCount: fileInfo.page_count || product?.page_count || 0
  }
}

/**
 * Get download-ready status for a product
 * @param {Object} product - Product object
 * @returns {boolean} - True if product is ready for download
 */
export function isDownloadReady(product) {
  if (isImageProduct(product)) {
    return !!product.image
  }
  
  if (isPDFProduct(product)) {
    return isFileProcessingComplete(product)
  }
  
  return false
}

/**
 * Get product tags based on type and properties
 * @param {Object} product - Product object
 * @returns {Array} - Array of tag strings
 */
export function getProductTags(product) {
  const tags = []
  
  if (isPDFProduct(product)) {
    tags.push('PDF')
    
    const pageCount = product?.page_count || 0
    if (pageCount > 0) {
      tags.push(formatPageCount(pageCount))
    }
    
    if (hasPreviewPages(product)) {
      tags.push('Preview Available')
    }
  } else {
    tags.push('Digital Image')
  }
  
  tags.push('Instant Download')
  
  return tags
}

/**
 * Validate if product has all required data for display
 * @param {Object} product - Product object
 * @returns {Object} - Validation result with isValid and missing fields
 */
export function validateProductForDisplay(product) {
  const missing = []
  
  if (!product) {
    return { isValid: false, missing: ['product'] }
  }
  
  if (!product.title) missing.push('title')
  if (!product.price) missing.push('price')
  
  if (isPDFProduct(product)) {
    if (!product.pdf_file_id) missing.push('pdf_file_id')
    if (!product.page_count) missing.push('page_count')
    
    if (!hasPreviewPages(product)) {
      missing.push('preview_pages')
    }
  } else {
    if (!product.image) missing.push('image')
  }
  
  return {
    isValid: missing.length === 0,
    missing
  }
}

/**
 * Get SEO-friendly alt text for product images
 * @param {Object} product - Product object
 * @param {number} pageNumber - Page number for PDF products
 * @returns {string} - Alt text
 */
export function getProductImageAlt(product, pageNumber = null) {
  const title = product?.title || 'Digital Art'
  
  if (isPDFProduct(product) && pageNumber) {
    return `${title} - Page ${pageNumber} Preview`
  }
  
  return title
}

/**
 * Check if product should show preview limit notice
 * @param {Object} product - Product object
 * @returns {boolean} - True if should show notice
 */
export function shouldShowPreviewLimitNotice(product) {
  if (!isPDFProduct(product)) return false
  
  const pageCount = product?.page_count || 0
  const previewLimit = getPreviewPageLimit(product)
  
  return pageCount > previewLimit
}

/**
 * Generate a consistent "sold" count for a product based on its ID
 * This ensures the same product always shows the same sold count
 * @param {Object} product - The product object
 * @returns {string} - Formatted sold count like "30+ sold"
 */
export function getProductSoldCount(product) {
  if (!product?.id) {
    return '10+ sold' // Fallback for products without ID
  }
  
  // Create a simple hash from the product ID to get consistent results
  let hash = 0
  const id = product.id.toString()
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Make hash positive
  hash = Math.abs(hash)
  
  // Define sold count brackets with weights (more likely to get lower numbers)
  const brackets = [
    { count: '10+', weight: 30 },
    { count: '30+', weight: 25 },
    { count: '50+', weight: 20 },
    { count: '100+', weight: 15 },
    { count: '200+', weight: 7 },
    { count: '500+', weight: 3 }
  ]
  
  // Calculate total weight
  const totalWeight = brackets.reduce((sum, bracket) => sum + bracket.weight, 0)
  
  // Use hash to select bracket
  const selection = hash % totalWeight
  let currentWeight = 0
  
  for (const bracket of brackets) {
    currentWeight += bracket.weight
    if (selection < currentWeight) {
      return `${bracket.count} sold`
    }
  }
  
  // Fallback (should never reach here)
  return '30+ sold'
}