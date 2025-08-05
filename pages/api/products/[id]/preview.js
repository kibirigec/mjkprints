import { supabase } from '../../../../lib/supabase'
import { normalizePreviewUrls, getPreviewUrlCount, debugPreviewUrls } from '../../../../utils/previewUtils'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' })
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

    if (productError) {
      console.error('Error fetching product:', productError)
      return res.status(404).json({ error: 'Product not found' })
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    // Check if product has PDF file
    if (!product.pdf_file_id || !product.file_uploads) {
      return res.status(404).json({ 
        error: 'No PDF file associated with this product',
        product_type: 'image'
      })
    }

    const fileUpload = product.file_uploads

    // Check if file processing is complete
    if (fileUpload.processing_status !== 'completed') {
      return res.status(202).json({ 
        error: 'PDF is still being processed',
        processing_status: fileUpload.processing_status,
        message: 'Preview images are not yet available. Please try again in a few moments.'
      })
    }

    // Validate and normalize preview URLs using centralized utility
    const previewUrlsArray = normalizePreviewUrls(fileUpload.preview_urls)
    debugPreviewUrls(fileUpload.preview_urls, 'PreviewAPI')

    if (previewUrlsArray.length === 0) {
      return res.status(404).json({ 
        error: 'No preview images available for this PDF',
        processing_status: fileUpload.processing_status,
        details: fileUpload.preview_urls ? 'Preview URLs exist but are invalid' : 'No preview URLs found'
      })
    }

    // Validate input parameters
    const productPreviewPages = product.preview_pages || 3
    const filePageCount = fileUpload.page_count || 0
    
    if (productPreviewPages <= 0) {
      return res.status(400).json({
        error: 'Invalid preview page configuration',
        details: 'Product preview_pages must be greater than 0'
      })
    }

    // Determine how many preview pages to show
    const maxPreviewPages = Math.min(
      productPreviewPages,
      filePageCount,
      previewUrlsArray.length
    )

    // Validate that we have a reasonable number of pages
    if (maxPreviewPages <= 0) {
      return res.status(404).json({
        error: 'No preview pages available',
        details: `Calculated maxPreviewPages: ${maxPreviewPages}`
      })
    }

    // Get the preview URLs (limited to maxPreviewPages)
    const previewUrls = previewUrlsArray.slice(0, maxPreviewPages)

    // Return preview data
    res.status(200).json({
      product_id: product.id,
      title: product.title,
      total_pages: product.page_count || fileUpload.page_count,
      preview_pages: maxPreviewPages,
      preview_urls: previewUrls,
      thumbnail_urls: fileUpload.thumbnail_urls || {},
      processing_status: fileUpload.processing_status,
      message: maxPreviewPages < (product.page_count || fileUpload.page_count) 
        ? `Showing preview of ${maxPreviewPages} pages out of ${product.page_count || fileUpload.page_count} total pages`
        : `Showing all ${maxPreviewPages} pages`
    })

  } catch (error) {
    console.error('Error in preview API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Helper function to validate preview URL access
export function validatePreviewAccess(product, requestedPage = 1) {
  // Basic validation
  if (!product || !product.pdf_file_id) {
    return { valid: false, reason: 'Not a PDF product' }
  }

  if (!product.file_uploads || product.file_uploads.processing_status !== 'completed') {
    return { valid: false, reason: 'File not processed' }
  }

  const maxPreview = product.preview_pages || 3
  const totalPages = product.page_count || product.file_uploads.page_count || 0

  if (requestedPage > maxPreview) {
    return { 
      valid: false, 
      reason: `Preview limited to ${maxPreview} pages`,
      max_preview: maxPreview,
      total_pages: totalPages
    }
  }

  if (requestedPage > totalPages) {
    return { 
      valid: false, 
      reason: `Page ${requestedPage} does not exist`,
      total_pages: totalPages
    }
  }

  return { valid: true }
}

// Rate limiting configuration (can be extended)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}