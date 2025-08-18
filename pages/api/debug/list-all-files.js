import { supabaseAdmin, supabase } from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      return
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const results = {
      timestamp: new Date().toISOString(),
      fileUploads: [],
      products: [],
      analysis: {}
    }

    // Check file_uploads table directly
    const client = supabaseAdmin || supabase
    
    const { data: fileUploads, error: fileError } = await client
      .from('file_uploads')
      .select('*')
      .order('created_at', { ascending: false })

    if (fileError) {
      results.fileUploads = { error: fileError.message }
    } else {
      results.fileUploads = fileUploads || []
    }

    // Check products table
    const { data: products, error: productError } = await client
      .from('products')
      .select(`
        id,
        title,
        pdf_file_id,
        image_file_id,
        created_at,
        file_uploads!pdf_file_id(
          id,
          file_name,
          file_type,
          file_size,
          storage_path,
          processing_status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (productError) {
      results.products = { error: productError.message }
    } else {
      results.products = products || []
    }

    // Analysis
    results.analysis = {
      totalFileUploads: Array.isArray(results.fileUploads) ? results.fileUploads.length : 0,
      totalProducts: Array.isArray(results.products) ? results.products.length : 0,
      productsWithFiles: Array.isArray(results.products) 
        ? results.products.filter(p => p.file_uploads).length 
        : 0,
      productsWithPdfFileId: Array.isArray(results.products) 
        ? results.products.filter(p => p.pdf_file_id).length 
        : 0,
      orphanedFiles: Array.isArray(results.fileUploads) && Array.isArray(results.products)
        ? results.fileUploads.filter(file => 
            !results.products.some(product => 
              product.pdf_file_id === file.id || product.image_file_id === file.id
            )
          ).length
        : 0
    }

    // Get some sample file upload IDs for testing
    if (Array.isArray(results.fileUploads) && results.fileUploads.length > 0) {
      results.analysis.sampleFileIds = results.fileUploads.slice(0, 3).map(f => ({
        id: f.id,
        fileName: f.file_name,
        fileType: f.file_type,
        isReferenced: Array.isArray(results.products) 
          ? results.products.some(p => p.pdf_file_id === f.id || p.image_file_id === f.id)
          : false
      }))
    }

    return res.status(200).json(results)

  } catch (error) {
    console.error('[DEBUG] List files error:', error)
    return res.status(500).json({
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    })
  }
}