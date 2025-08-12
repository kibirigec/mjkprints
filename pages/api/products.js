import { 
  getAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  createProductWithPDF,
  createProductWithImage,
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
          const { title, description, price, image, pdfFileId, pdfData, imageFileId, imageData } = req.body

          console.log('[PRODUCTS-API] ======= PRODUCT CREATION REQUEST =======')
          console.log('[PRODUCTS-API] Request method: POST (creating new product)')
          console.log('[PRODUCTS-API] Basic product fields:', { 
            title: title?.substring(0, 50) + '...', 
            description: description?.substring(0, 50) + '...',
            price: price,
            image: image?.substring(0, 100)
          })
          console.log('[PRODUCTS-API] File associations:', { 
            hasPDF: !!pdfFileId,
            pdfFileId: pdfFileId,
            hasPdfData: !!pdfData,
            hasImage: !!imageFileId,
            imageFileId: imageFileId,
            hasImageData: !!imageData
          })
          console.log('[PRODUCTS-API] Complete request body keys:', Object.keys(req.body))
          console.log('[PRODUCTS-API] Complete request body:', req.body)
          
          // Debug: Log the complete request body structure and validate file ID
          if (pdfFileId) {
            console.log('[PRODUCTS-API] PDF file details:', {
              fileId: pdfFileId,
              fileIdType: typeof pdfFileId,
              fileIdLength: pdfFileId?.length,
              pdfDataKeys: pdfData ? Object.keys(pdfData) : 'no pdfData'
            })
            
            // Validate UUID format
            const pdfUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!pdfUuidRegex.test(pdfFileId)) {
              console.error('[PRODUCTS-API] Invalid PDF file ID format:', pdfFileId)
              return res.status(400).json({ 
                error: 'Invalid PDF file ID',
                details: 'The PDF file ID must be a valid UUID format'
              })
            }
          }
          
          // Debug: Log image file details and validate image file ID
          if (imageFileId) {
            console.log('[PRODUCTS-API] Image file details:', {
              fileId: imageFileId,
              fileIdType: typeof imageFileId,
              fileIdLength: imageFileId?.length,
              imageDataKeys: imageData ? Object.keys(imageData) : 'no imageData'
            })
            
            // Validate UUID format
            const imageUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            if (!imageUuidRegex.test(imageFileId)) {
              console.error('[PRODUCTS-API] Invalid image file ID format:', imageFileId)
              return res.status(400).json({ 
                error: 'Invalid image file ID',
                details: 'The image file ID must be a valid UUID format'
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

          // Declare productData for use in catch block
          let productData = {
            title: title.trim(),
            description: description.trim(),
            price: numericPrice,
            image: image.trim()
          }

          console.log('[PRODUCTS-API] ======= DETERMINING CREATION STRATEGY =======')
          console.log('[PRODUCTS-API] productData before file IDs:', productData)

          // Create product with file references if provided
          let newProduct
          if (pdfFileId && imageFileId) {
            // Both PDF and image files provided
            console.log('[PRODUCTS-API] 🔄 Strategy: Creating product with BOTH PDF and image file IDs')
            console.log('[PRODUCTS-API] PDF file ID:', pdfFileId)
            console.log('[PRODUCTS-API] Image file ID:', imageFileId)
            // Set both file IDs in product data
            productData.pdf_file_id = pdfFileId
            productData.image_file_id = imageFileId
            console.log('[PRODUCTS-API] Final productData with both IDs:', productData)
            newProduct = await createProduct(productData)
          } else if (pdfFileId) {
            // Only PDF file provided
            console.log('[PRODUCTS-API] 📄 Strategy: Creating product with PDF file ID only:', pdfFileId)
            newProduct = await createProductWithPDF(productData, pdfFileId)
          } else if (imageFileId) {
            // Only image file provided
            console.log('[PRODUCTS-API] 🖼️  Strategy: Creating product with IMAGE file ID only:', imageFileId)
            console.log('[PRODUCTS-API] Calling createProductWithImage() with:', { productData, imageFileId })
            newProduct = await createProductWithImage(productData, imageFileId)
          } else {
            // No file IDs provided
            console.log('[PRODUCTS-API] 🔗 Strategy: Creating product without file uploads (URL only)')
            newProduct = await createProduct(productData)
          }
          
          console.log('[PRODUCTS-API] ======= PRODUCT CREATION COMPLETE =======')
          console.log('[PRODUCTS-API] Created product:', { 
            id: newProduct.id, 
            title: newProduct.title,
            hasImageFileId: !!newProduct.image_file_id,
            imageFileId: newProduct.image_file_id,
            image: newProduct.image?.substring(0, 100)
          })
          console.log('[PRODUCTS-API] Complete created product data:', newProduct)
          res.status(201).json(newProduct)
        } catch (error) {
          console.error('[PRODUCTS-API] Create product error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            requestBodyKeys: req.body ? Object.keys(req.body) : 'no body'
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
          
          // Handle specific image-related errors with user-friendly messages
          if (error.message.includes('IMAGE file not found')) {
            return res.status(404).json({ 
              error: 'Image file not found',
              details: 'The referenced image file could not be found. Please upload the image again.'
            })
          }
          
          if (error.message.includes('IMAGE file is not ready')) {
            return res.status(409).json({ 
              error: 'Image file not ready',
              details: 'The image file is still being processed. Please wait a moment and try again.'
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