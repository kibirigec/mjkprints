// Debug endpoint to fix existing products that have placeholder URLs instead of actual uploaded image URLs
import { supabase, getFileStorageUrl } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {

    // Find products that have image_file_id but are using placeholder URLs
    const { data: products, error: queryError } = await supabase
      .from('products')
      .select(`
        id,
        title,
        image,
        image_file_id,
        image_file:file_uploads!image_file_id (
          id,
          storage_path
        )
      `)
      .not('image_file_id', 'is', null)
      .like('image', '%placeholder%')

    if (queryError) {
      console.error('❌ Query error:', queryError)
      return res.status(500).json({ error: 'Failed to query products', details: queryError })
    }


    const fixes = []
    const errors = []

    for (const product of products) {
      try {
        
        if (!product.image_file || !product.image_file.storage_path) {
          errors.push({
            productId: product.id,
            title: product.title,
            error: 'No image_file or storage_path available'
          })
          continue
        }

        // Generate the correct URL
        const correctImageUrl = getFileStorageUrl(product.image_file.storage_path)

        // Update the product
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update({ image: correctImageUrl })
          .eq('id', product.id)
          .select('id, title, image')
          .single()

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError)
          errors.push({
            productId: product.id,
            title: product.title,
            error: updateError.message
          })
          continue
        }

        fixes.push({
          productId: product.id,
          title: product.title,
          oldUrl: product.image,
          newUrl: correctImageUrl
        })

      } catch (error) {
        console.error(`   ❌ Error processing ${product.title}:`, error)
        errors.push({
          productId: product.id,
          title: product.title,
          error: error.message
        })
      }
    }


    return res.status(200).json({
      success: true,
      summary: {
        totalFound: products.length,
        fixed: fixes.length,
        errors: errors.length
      },
      fixes,
      errors
    })

  } catch (error) {
    console.error('❌ Fix process failed:', error)
    return res.status(500).json({
      error: 'Fix process failed',
      details: error.message
    })
  }
}