/**
 * URL Utilities for MJK Prints
 * Handles generation of product and modal links
 */

/**
 * Generate a modal link that opens the product in modal view on homepage
 * @param {string} productId - The product ID
 * @param {string} baseUrl - Optional base URL (for sharing/external links)
 * @returns {string} URL that opens product modal
 */
export const generateModalLink = (productId, baseUrl = '') => {
  if (!productId) {
    throw new Error('Product ID is required to generate modal link')
  }
  return `${baseUrl}/?modal=true&id=${productId}`
}

/**
 * Generate a static product page link (full page view)
 * @param {string} productId - The product ID  
 * @param {string} baseUrl - Optional base URL (for sharing/external links)
 * @returns {string} URL to static product page
 */
export const generateProductLink = (productId, baseUrl = '') => {
  if (!productId) {
    throw new Error('Product ID is required to generate product link')
  }
  return `${baseUrl}/product/${productId}`
}

/**
 * Generate a shareable modal link with full domain (for social sharing)
 * @param {string} productId - The product ID
 * @param {string} domain - The full domain (e.g., 'https://mjkprints.com')
 * @returns {string} Full URL for sharing
 */
export const generateShareableModalLink = (productId, domain = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001') => {
  return generateModalLink(productId, domain)
}

/**
 * Generate a shareable product link with full domain (for social sharing)
 * @param {string} productId - The product ID
 * @param {string} domain - The full domain (e.g., 'https://mjkprints.com')
 * @returns {string} Full URL for sharing
 */
export const generateShareableProductLink = (productId, domain = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001') => {
  return generateProductLink(productId, domain)
}

/**
 * Check if current URL indicates modal should be open
 * @param {object} query - Next.js router query object
 * @returns {boolean} True if modal should be open
 */
export const isModalUrl = (query) => {
  return query.modal === 'true' && !!query.id
}

/**
 * Extract product ID from router query
 * @param {object} query - Next.js router query object  
 * @returns {string|null} Product ID or null
 */
export const getProductIdFromQuery = (query) => {
  return isModalUrl(query) ? query.id : null
}

/**
 * Copy URL to clipboard with fallback for older browsers
 * @param {string} url - URL to copy
 * @returns {Promise<boolean>} Success status
 */
export const copyUrlToClipboard = async (url) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Modern browser with clipboard API
      await navigator.clipboard.writeText(url)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('Failed to copy URL to clipboard:', error)
    return false
  }
}