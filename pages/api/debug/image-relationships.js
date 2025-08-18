// Debug endpoint to analyze image relationships in database
import { supabase } from '../../../lib/supabase'
import { getProductImage } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {

    // Test the exact same query as getAllProducts()
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        pdf_file:file_uploads!pdf_file_id (
          id,
          file_name,
          file_size,
          file_type,
          processing_status,
          preview_urls,
          thumbnail_urls,
          dimensions,
          page_count,
          storage_path
        ),
        image_file:file_uploads!image_file_id (
          id,
          file_name,
          file_size,
          file_type,
          processing_status,
          dimensions,
          image_variants,
          thumbnail_urls,
          color_profile,
          orientation,
          storage_path
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5) // Test first 5 products

    if (error) {
      console.error('❌ Database query error:', error)
      return res.status(500).json({ error: 'Database query failed', details: error })
    }


    const analysis = {
      totalProducts: data.length,
      products: [],
      summary: {
        withImageFileId: 0,
        withImageFileRelation: 0,
        withPlaceholderUrls: 0,
        withUploadedImages: 0
      }
    }

    data.forEach((product, index) => {
      const productAnalysis = {
        index: index + 1,
        id: product.id,
        title: product.title,
        imageUrl: product.image,
        imageFileId: product.image_file_id,
        hasImageFileRelation: !!product.image_file,
        imageFileDetails: null,
        getProductImageResult: null,
        issues: []
      }

      // Analyze image file relationship
      if (product.image_file) {
        productAnalysis.imageFileDetails = {
          id: product.image_file.id,
          fileName: product.image_file.file_name,
          storagePath: product.image_file.storage_path,
          processingStatus: product.image_file.processing_status,
          hasImageVariants: !!product.image_file.image_variants,
          imageVariants: product.image_file.image_variants ? Object.keys(product.image_file.image_variants) : []
        }
        analysis.summary.withImageFileRelation++
      } else if (product.image_file_id) {
        productAnalysis.issues.push('Has image_file_id but no image_file relation!')
      }

      // Check for placeholder URLs
      if (product.image && product.image.includes('placeholder')) {
        productAnalysis.issues.push('Using placeholder image URL')
        analysis.summary.withPlaceholderUrls++
      }

      // Test getProductImage function
      try {
        const imageResult = getProductImage(product)
        productAnalysis.getProductImageResult = imageResult
        
        if (imageResult && imageResult.source === 'uploaded_image') {
          analysis.summary.withUploadedImages++
        }
      } catch (error) {
        productAnalysis.issues.push(`getProductImage error: ${error.message}`)
      }

      if (product.image_file_id) {
        analysis.summary.withImageFileId++
      }

      analysis.products.push(productAnalysis)

    })

    // Additional query: Find products that should have uploaded images
    const productsWithImageFileId = await supabase
      .from('products')
      .select('id, title, image, image_file_id')
      .not('image_file_id', 'is', null)
      .limit(10)

    analysis.productsWithImageFileId = productsWithImageFileId.data || []
    

    // Check file_uploads table
    const fileUploadsQuery = await supabase
      .from('file_uploads')
      .select('id, file_name, file_type, processing_status, storage_path')
      .eq('file_type', 'image')
      .limit(10)

    analysis.imageFileUploads = fileUploadsQuery.data || []

    return res.status(200).json({
      success: true,
      analysis,
      recommendations: generateRecommendations(analysis)
    })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return res.status(500).json({ 
      error: 'Debug analysis failed', 
      details: error.message 
    })
  }
}

function generateRecommendations(analysis) {
  const recommendations = []

  if (analysis.summary.withImageFileId > analysis.summary.withImageFileRelation) {
    recommendations.push('Some products have image_file_id but the relationship is not loading properly')
  }

  if (analysis.summary.withPlaceholderUrls > 0) {
    recommendations.push('Products are using placeholder URLs instead of uploaded images')
  }

  if (analysis.summary.withUploadedImages === 0 && analysis.summary.withImageFileId > 0) {
    recommendations.push('getProductImage() is not returning uploaded images despite image_file_id being present')
  }

  if (recommendations.length === 0) {
    recommendations.push('Image system appears to be working correctly')
  }

  return recommendations
}