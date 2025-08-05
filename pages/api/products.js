import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  createProductWithPDF,
  updateProductWithPDFInfo
} from '../../lib/supabase'

export default async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        const products = await getAllProducts()
        res.status(200).json(products)
        break

      case 'POST':
        try {
          const { title, description, price, image, pdfFileId, pdfData } = req.body

          console.log('[PRODUCTS-API] Creating product:', { 
            title, 
            hasPDF: !!pdfFileId,
            pdfFileId: pdfFileId,
            hasPdfData: !!pdfData,
            requestBody: Object.keys(req.body)
          })
          
          // Debug: Log the complete request body structure and validate file ID
          if (pdfFileId) {
            console.log('[PRODUCTS-API] PDF file details:', {
              fileId: pdfFileId,
              fileIdType: typeof pdfFileId,
              fileIdLength: pdfFileId?.length,
              pdfDataKeys: pdfData ? Object.keys(pdfData) : 'no pdfData'
            })
            
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!uuidRegex.test(pdfFileId)) {
              console.error('[PRODUCTS-API] Invalid PDF file ID format:', pdfFileId)
              return res.status(400).json({ 
                error: 'Invalid PDF file ID',
                details: 'The PDF file ID must be a valid UUID format'
              })
            }
          }

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

          const productData = {
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            image: image.trim()
          }

          // Create product with PDF reference if provided
          let newProduct
          if (pdfFileId) {
            console.log('[PRODUCTS-API] Creating product with PDF file ID:', pdfFileId)
            newProduct = await createProductWithPDF(productData, pdfFileId)
          } else {
            console.log('[PRODUCTS-API] Creating product without PDF')
            newProduct = await createProduct(productData)
          }
          
          console.log('[PRODUCTS-API] Product created successfully:', { id: newProduct.id, title: newProduct.title })
          res.status(201).json(newProduct)
        } catch (error) {
          console.error('[PRODUCTS-API] Create product error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            productData: { title: productData?.title, hasPDF: !!pdfFileId },
            pdfFileId: pdfFileId
          })
          
          // Handle specific PDF-related errors with user-friendly messages
          if (error.message.includes('PDF file not found')) {
            return res.status(404).json({ 
              error: 'PDF file not found',
              details: 'The referenced PDF file could not be found. Please upload the PDF again.'
            })
          }
          
          if (error.message.includes('PDF file is not ready')) {
            return res.status(409).json({ 
              error: 'PDF file not ready',
              details: 'The PDF file is still being processed. Please wait a moment and try again.'
            })
          }
          
          if (error.message.includes('new row violates row-level security policy')) {
            return res.status(403).json({ 
              error: 'Permission denied',
              details: 'Unable to create product due to database permissions. Please check your configuration.'
            })
          }
          
          // Generic error response
          res.status(500).json({ 
            error: 'Failed to create product',
            details: error.message 
          })
        }
        break

      case 'PUT':
        try {
          const { id, title, description, price, image, pdfFileId, pdfData } = req.body

          if (!id || !title || !description || !price || !image) {
            return res.status(400).json({ 
              error: 'Missing required fields: id, title, description, price, image' 
            })
          }

          // Validate price
          const numericPrice = parseFloat(price)
          if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ 
              error: 'Price must be a positive number' 
            })
          }

          const productData = {
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            image: image.trim(),
            pdf_file_id: pdfFileId || null
          }

          const updatedProduct = await updateProduct(id, productData)

          // Update PDF-specific data if provided
          if (pdfData) {
            await updateProductWithPDFInfo(id, pdfData)
          }

          res.status(200).json(updatedProduct)
        } catch (error) {
          console.error('Update product error:', error)
          if (error.message.includes('Failed to update product')) {
            res.status(404).json({ error: 'Product not found' })
          } else {
            res.status(500).json({ 
              error: 'Failed to update product',
              details: error.message 
            })
          }
        }
        break

      case 'DELETE':
        try {
          const { id } = req.query

          if (!id) {
            return res.status(400).json({ error: 'Product ID is required' })
          }

          const deletedProduct = await deleteProduct(id)
          
          res.status(200).json({ 
            message: 'Product deleted successfully',
            product: deletedProduct 
          })
        } catch (error) {
          console.error('Delete product error:', error)
          if (error.message.includes('Failed to delete product')) {
            res.status(404).json({ error: 'Product not found' })
          } else {
            res.status(500).json({ 
              error: 'Failed to delete product',
              details: error.message 
            })
          }
        }
        break

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
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