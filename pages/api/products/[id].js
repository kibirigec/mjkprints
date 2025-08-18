import { 
  getProductById, 
  updateProduct, 
  deleteProduct 
} from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  const { method, query } = req
  const { id } = query

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid product ID format. Expected UUID.' })
  }

  // Protect write operations (PUT, DELETE) with authentication
  if (['PUT', 'DELETE'].includes(method)) {
    try {
      const isAuthenticated = verifyAdminSession(req, res)
      if (!isAuthenticated) {
        return // Response already sent by verifyAdminSession
      }
    } catch (error) {
      console.error('Authentication error:', error)
      return res.status(401).json({ error: 'Authentication required' })
    }
  }

  try {
    switch (method) {
      case 'GET':
        const product = await getProductById(id)
        
        if (!product) {
          return res.status(404).json({ error: 'Product not found' })
        }
        
        res.status(200).json(product)
        break

      case 'PUT':
        try {
          const { title, description, price, image, pdfFileId, pdfData, imageFileId, imageData } = req.body

            title: title?.substring(0, 50) + '...', 
            description: description?.substring(0, 50) + '...',
            price,
            image: image?.substring(0, 100)
          })
            hasPDF: !!pdfFileId,
            pdfFileId: pdfFileId,
            hasImage: !!imageFileId,
            imageFileId: imageFileId
          })

          if (!title || !description || !price || !image) {
            return res.status(400).json({ 
              error: 'Missing required fields: title, description, price, image' 
            })
          }

          // Validate price
          const numericPrice = parseFloat(price)
          if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ 
              error: 'Price must be a positive number' 
            })
          }

          // Check if product exists first
          const existingProduct = await getProductById(id)
          if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' })
          }

          // Prepare product data with file associations
          const productData = {
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            image: image.trim()
          }

          // Include file IDs if provided
          if (pdfFileId) {
            productData.pdf_file_id = pdfFileId
          }
          
          if (imageFileId) {
            productData.image_file_id = imageFileId
          }

          
          const updatedProduct = await updateProduct(id, productData)
          
            id: updatedProduct.id, 
            title: updatedProduct.title,
            hasImageFileId: !!updatedProduct.image_file_id,
            imageFileId: updatedProduct.image_file_id,
            image: updatedProduct.image?.substring(0, 100)
          })
          

          res.status(200).json(updatedProduct)
        } catch (error) {
          console.error('Update product error:', error)
          res.status(500).json({ 
            error: 'Failed to update product',
            details: error.message 
          })
        }
        break

      case 'DELETE':
        try {
          // Check if product exists first
          const existingProduct = await getProductById(id)
          if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' })
          }

          const deletedProduct = await deleteProduct(id)
          
          res.status(200).json({ 
            message: 'Product deleted successfully',
            product: deletedProduct 
          })
        } catch (error) {
          console.error('Delete product error:', error)
          res.status(500).json({ 
            error: 'Failed to delete product',
            details: error.message 
          })
        }
        break

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}