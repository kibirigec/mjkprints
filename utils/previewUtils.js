/**
 * Utility functions for handling preview URLs in different formats
 * Handles both legacy array format and new object format
 */

/**
 * Convert relative storage path to full Supabase URL
 * @param {string} relativePath - Relative path like 'previews/file.jpg'
 * @returns {string|null} - Full Supabase storage URL or null if invalid
 */
export function constructSupabaseUrl(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') {
    return null
  }

  // If it's already a full URL, return as-is
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath
  }

  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!supabaseUrl) {
    console.error('[previewUtils] NEXT_PUBLIC_SUPABASE_URL not configured')
    return null
  }

  // Construct full Supabase storage URL
  // Format: https://your-project.supabase.co/storage/v1/object/public/bucket-name/path
  const bucketName = 'mjk-prints-storage' // Adjust this to match your bucket name
  const fullUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${relativePath}`
  
  return fullUrl
}

/**
 * Normalize preview URLs to a consistent array format
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @returns {string[]} - Array of valid preview URL strings (full URLs)
 */
export function normalizePreviewUrls(rawPreviewUrls) {
  // Handle null/undefined/empty cases
  if (!rawPreviewUrls) {
    return []
  }

  let urlsToProcess = []

  // Handle array format (legacy)
  if (Array.isArray(rawPreviewUrls)) {
    urlsToProcess = rawPreviewUrls.filter(url => 
      typeof url === 'string' && 
      url.trim().length > 0 &&
      isValidPreviewUrl(url)
    )
  }
  // Handle object format (new)
  else if (typeof rawPreviewUrls === 'object' && rawPreviewUrls !== null) {
    const sizeOrder = ['large', 'medium', 'small']
    urlsToProcess = sizeOrder
      .map(size => rawPreviewUrls[size])
      .filter(url => 
        typeof url === 'string' && 
        url.trim().length > 0 &&
        isValidPreviewUrl(url)
      )
  }
  else {
    // Handle unexpected types
    console.warn('[previewUtils] Unexpected preview_urls type:', typeof rawPreviewUrls)
    return []
  }

  // Convert all relative paths to full Supabase URLs
  return urlsToProcess
    .map(url => constructSupabaseUrl(url))
    .filter(url => url !== null)
}

/**
 * Basic URL validation for preview URLs
 * @param {string} url - URL to validate (can be relative path or full URL)
 * @returns {boolean} - True if URL appears valid
 */
function isValidPreviewUrl(url) {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return false
  }

  const trimmedUrl = url.trim()

  // Check for obviously malicious patterns
  const maliciousPatterns = [
    'javascript:', 'data:', 'vbscript:', 'file:', 'ftp:',
    '<script', 'onerror=', 'onload=', 'onclick='
  ]
  
  const lowerUrl = trimmedUrl.toLowerCase()
  if (maliciousPatterns.some(pattern => lowerUrl.includes(pattern))) {
    return false
  }

  try {
    // If it's a full URL, validate it properly
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      const urlObj = new URL(trimmedUrl)
      return ['http:', 'https:'].includes(urlObj.protocol)
    }
    
    // If it's a relative path, check for valid storage patterns
    const validStoragePaths = [
      'previews/', 'uploads/', 'thumbnails/', 'images/',
      'storage/', 'files/', 'media/', 'assets/'
    ]
    
    // Check if it starts with a valid storage path pattern
    return validStoragePaths.some(pattern => trimmedUrl.startsWith(pattern)) ||
           // Or contains valid file extensions
           /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(trimmedUrl)
    
  } catch {
    return false
  }
}

/**
 * Get the first available preview URL from normalized data
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @returns {string|null} - First valid preview URL (full URL) or null
 */
export function getFirstPreviewUrl(rawPreviewUrls) {
  const normalized = normalizePreviewUrls(rawPreviewUrls)
  return normalized.length > 0 ? normalized[0] : null
}

/**
 * Check if preview URLs exist and are valid
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @returns {boolean} - True if valid preview URLs exist
 */
export function hasValidPreviewUrls(rawPreviewUrls) {
  const normalized = normalizePreviewUrls(rawPreviewUrls)
  return normalized.length > 0
}

/**
 * Get preview URL for a specific page (1-indexed)
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @param {number} pageNumber - Page number (1-indexed)
 * @returns {string|null} - Preview URL for the page (full URL) or null
 */
export function getPreviewUrlForPage(rawPreviewUrls, pageNumber) {
  const normalized = normalizePreviewUrls(rawPreviewUrls)
  
  if (pageNumber < 1 || pageNumber > normalized.length) {
    return null
  }
  
  return normalized[pageNumber - 1] || null
}

/**
 * Get the count of available preview URLs
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @returns {number} - Number of valid preview URLs
 */
export function getPreviewUrlCount(rawPreviewUrls) {
  const normalized = normalizePreviewUrls(rawPreviewUrls)
  return normalized.length
}

/**
 * Convert object format preview URLs to legacy array format
 * Useful for backward compatibility with existing code
 * @param {Object} objectFormatUrls - Object format: {small: "url", medium: "url", large: "url"}
 * @returns {string[]} - Array of URLs prioritizing larger sizes
 */
export function convertObjectToArrayFormat(objectFormatUrls) {
  if (!objectFormatUrls || typeof objectFormatUrls !== 'object') {
    return []
  }

  const sizeOrder = ['large', 'medium', 'small']
  return sizeOrder
    .filter(size => objectFormatUrls[size])
    .map(size => objectFormatUrls[size])
    .filter(url => typeof url === 'string' && url.trim().length > 0)
}

/**
 * Debug helper to log preview URL format information
 * @param {Array|Object|null|undefined} rawPreviewUrls - Raw preview URLs data
 * @param {string} context - Context for debugging (e.g., "PDFViewer", "API")
 */
export function debugPreviewUrls(rawPreviewUrls, context = 'unknown') {
  if (process.env.NODE_ENV === 'development') {
    // This function is intentionally left empty on the master branch.
  }
}