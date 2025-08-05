import { supabase } from '../../../../../lib/supabase'
import { validatePreviewAccess } from '../preview'
import { normalizePreviewUrls, getPreviewUrlForPage, debugPreviewUrls } from '../../../../../utils/previewUtils'

export default async function handler(req, res) {
  const { id, page } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!id || !page) {
    return res.status(400).json({ error: 'Product ID and page number are required' })
  }

  const pageNumber = parseInt(page, 10)
  if (isNaN(pageNumber) || pageNumber < 1) {
    return res.status(400).json({ error: 'Invalid page number' })
  }

  try {
    // Get product with file information
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        pdf_file_id,
        page_count,
        preview_pages,
        file_uploads!pdf_file_id (
          id,
          processing_status,
          preview_urls,
          thumbnail_urls,
          page_count
        )
      `)
      .eq('id', id)
      .single()

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Validate preview access
    const accessValidation = validatePreviewAccess(product, pageNumber)
    if (!accessValidation.valid) {
      return res.status(403).json({ 
        error: accessValidation.reason,
        max_preview: accessValidation.max_preview,
        total_pages: accessValidation.total_pages
      })
    }

    const fileUpload = product.file_uploads
    
    // Validate and normalize preview URLs using centralized utility
    const previewUrls = normalizePreviewUrls(fileUpload.preview_urls)
    debugPreviewUrls(fileUpload.preview_urls, 'PagePreviewAPI')

    // Check if the requested page preview exists
    if (pageNumber > previewUrls.length) {
      return res.status(404).json({ 
        error: `Preview for page ${pageNumber} not available`,
        available_pages: previewUrls.length,
        requested_page: pageNumber
      })
    }

    // Use utility function to get preview URL for specific page
    const previewUrl = getPreviewUrlForPage(fileUpload.preview_urls, pageNumber)

    if (!previewUrl) {
      return res.status(404).json({ 
        error: `Preview image for page ${pageNumber} not found`
      })
    }

    // For direct image serving, redirect to the preview URL
    // This allows the browser to cache the image properly
    if (req.query.direct === 'true') {
      return res.redirect(307, previewUrl)
    }

    // Return preview page data
    res.status(200).json({
      product_id: product.id,
      title: product.title,
      page_number: pageNumber,
      total_pages: product.page_count || fileUpload.page_count,
      max_preview_pages: product.preview_pages || 3,
      preview_url: previewUrl,
      thumbnail_url: fileUpload.thumbnail_urls?.medium || fileUpload.thumbnail_urls?.small,
      processing_status: fileUpload.processing_status,
      is_preview_limited: pageNumber >= (product.preview_pages || 3),
      message: `Page ${pageNumber} of ${product.page_count || fileUpload.page_count}`
    })

  } catch (error) {
    console.error('Error in page preview API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Security headers for image serving
export function addSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200') // Cache for 1 hour
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}