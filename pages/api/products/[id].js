import { 
  getProductById, 
  updateProduct, 
  deleteProduct 
} from '../../../lib/supabase'

export default async function handler(req, res) {
  const { method, query } = req
  const { id } = query

  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' })
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
          const { title, description, price, image } = req.body

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

          const updatedProduct = await updateProduct(id, {
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            image: image.trim()
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