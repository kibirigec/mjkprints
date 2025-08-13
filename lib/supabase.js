import { createClient } from '@supabase/supabase-js'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
})

// Service role client for admin operations (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

export const createProduct = async (productData) => {
  // Use admin client to bypass RLS policies for product creation
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[PRODUCT-CREATE] No service role key configured, using anon client (may fail due to RLS)')
  }
  
  const { data, error } = await client
    .from('products')
    .insert([
      {
        title: productData.title,
        description: productData.description,
        price: productData.price,
        image: productData.image,
        image_file_id: productData.image_file_id || null,
        pdf_file_id: productData.pdf_file_id || null
      }
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return data
}

export const getAllProducts = async () => {
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

  if (error) {
    console.error('[GETALLPRODUCTS] Database error:', error)
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return data || []
}

export const getProductById = async (id) => {
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
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch product: ${error.message}`)
  }

  return data
}

export const updateProduct = async (id, productData) => {
  console.log('[UPDATEPRODUCT] ======= DATABASE UPDATE STARTING =======')
  console.log('[UPDATEPRODUCT] Product ID:', id)
  console.log('[UPDATEPRODUCT] Input productData:', productData)
  
  // Use admin client to bypass RLS policies for product updates
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[UPDATEPRODUCT] No service role key configured, using anon client (may fail due to RLS)')
  } else {
    console.log('[UPDATEPRODUCT] Using admin client for RLS bypass')
  }
  
  const updateData = {
    title: productData.title,
    description: productData.description,
    price: productData.price,
    image: productData.image,
    updated_at: new Date().toISOString()
  }
  
  // Only update file references if they are explicitly provided
  if (productData.hasOwnProperty('pdf_file_id')) {
    updateData.pdf_file_id = productData.pdf_file_id
    console.log('[UPDATEPRODUCT] Setting pdf_file_id:', productData.pdf_file_id)
  }
  if (productData.hasOwnProperty('image_file_id')) {
    updateData.image_file_id = productData.image_file_id
    console.log('[UPDATEPRODUCT] Setting image_file_id:', productData.image_file_id)
  }
  
  console.log('[UPDATEPRODUCT] Final updateData being sent to database:', updateData)
  
  const { data, error } = await client
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  console.log('[UPDATEPRODUCT] ======= DATABASE RESPONSE =======')
  if (error) {
    console.error('[UPDATEPRODUCT] Database error:', error)
    console.error('[UPDATEPRODUCT] Error details:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details
    })
    throw new Error(`Failed to update product: ${error.message}`)
  }

  console.log('[UPDATEPRODUCT] Database update successful!')
  console.log('[UPDATEPRODUCT] Returned data:', {
    id: data.id,
    title: data.title,
    image_file_id: data.image_file_id,
    pdf_file_id: data.pdf_file_id,
    image: data.image?.substring(0, 100)
  })
  console.log('[UPDATEPRODUCT] Complete returned data:', data)

  return data
}

export const deleteProduct = async (id) => {
  // Use admin client to bypass RLS policies for product deletion
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.error('[PRODUCT-DELETE] CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
    console.error('[PRODUCT-DELETE] Product deletion requires admin privileges for RLS bypass')
    throw new Error('Server configuration error: Product deletion requires admin privileges. Please contact support.')
  }

  console.log(`[PRODUCT-DELETE] Starting deletion for product ID: ${id}`)

  try {
    // First, get the product and its associated files for cleanup
    const { data: productData, error: fetchError } = await client
      .from('products')
      .select(`
        *,
        file_uploads:pdf_file_id(id, storage_path, file_name),
        image_uploads:image_file_id(id, storage_path, file_name)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error(`[PRODUCT-DELETE] Failed to fetch product data:`, fetchError)
      throw new Error(`Failed to fetch product: ${fetchError.message}`)
    }

    if (!productData) {
      console.log(`[PRODUCT-DELETE] Product not found: ${id}`)
      throw new Error('Product not found')
    }

    console.log(`[PRODUCT-DELETE] Found product: ${productData.title}`)
    console.log(`[PRODUCT-DELETE] Associated files:`, {
      pdfFile: productData.file_uploads?.file_name || 'none',
      imageFile: productData.image_uploads?.file_name || 'none'
    })

    // Delete the product (this should cascade to file_uploads due to foreign key)
    const { data, error: deleteError } = await client
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (deleteError) {
      console.error(`[PRODUCT-DELETE] Database deletion failed:`, deleteError)
      
      // Provide specific error messages based on the error type
      if (deleteError.message.includes('new row violates row-level security policy')) {
        throw new Error('Permission denied: Insufficient privileges to delete product. Admin access required.')
      } else if (deleteError.message.includes('violates foreign key constraint')) {
        throw new Error('Cannot delete product: It is referenced by existing orders or downloads.')
      } else {
        throw new Error(`Failed to delete product: ${deleteError.message}`)
      }
    }

    console.log(`[PRODUCT-DELETE] Successfully deleted product: ${data.id} (${data.title})`)

    // Cleanup any orphaned files from storage if needed
    // Note: file_uploads should be auto-deleted by cascade, but we might need manual storage cleanup
    const filesToCleanup = []
    if (productData.file_uploads?.storage_path) {
      filesToCleanup.push(productData.file_uploads.storage_path)
    }
    if (productData.image_uploads?.storage_path) {
      filesToCleanup.push(productData.image_uploads.storage_path)
    }

    if (filesToCleanup.length > 0) {
      console.log(`[PRODUCT-DELETE] Cleaning up ${filesToCleanup.length} storage files`)
      try {
        const { error: storageError } = await client.storage
          .from('mjk-prints-storage')
          .remove(filesToCleanup)
        
        if (storageError) {
          console.warn(`[PRODUCT-DELETE] Storage cleanup failed (non-critical):`, storageError.message)
          // Don't fail the deletion if storage cleanup fails
        } else {
          console.log(`[PRODUCT-DELETE] Successfully cleaned up storage files`)
        }
      } catch (storageCleanupError) {
        console.warn(`[PRODUCT-DELETE] Storage cleanup error (non-critical):`, storageCleanupError.message)
      }
    }

    return data
  } catch (error) {
    console.error(`[PRODUCT-DELETE] Deletion failed for ${id}:`, {
      error: error.message,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    })
    throw error
  }
}

// Order management functions
export const createOrder = async (orderData) => {
  // Use admin client to bypass RLS policies for order creation
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[ORDER-CREATE] No service role key configured, using anon client (may fail due to RLS)')
  }
  
  const { data, error } = await client
    .from('orders')
    .insert([
      {
        email: orderData.email,
        total_amount: orderData.total_amount,
        currency: orderData.currency || 'USD',
        status: orderData.status || 'pending',
        stripe_session_id: orderData.stripe_session_id,
        billing_details: orderData.billing_details,
        metadata: orderData.metadata
      }
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`)
  }

  return data
}

export const createOrderItems = async (orderId, items) => {
  // Use admin client to bypass RLS policies for order item creation
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[ORDER-ITEMS-CREATE] No service role key configured, using anon client (may fail due to RLS)')
  }
  
  const orderItems = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity
  }))

  const { data, error } = await client
    .from('order_items')
    .insert(orderItems)
    .select()

  if (error) {
    throw new Error(`Failed to create order items: ${error.message}`)
  }

  return data
}

export const updateOrderStatus = async (orderId, status, paymentIntentId = null) => {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  }

  if (paymentIntentId) {
    updateData.stripe_payment_intent_id = paymentIntentId
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`)
  }

  return data
}

export const getOrderById = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (*)
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch order: ${error.message}`)
  }

  return data
}

export const getOrdersByEmail = async (email) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (*)
      )
    `)
    .eq('email', email)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`)
  }

  return data || []
}

// Customer management
export const createOrUpdateCustomer = async (customerData) => {
  const { data, error } = await supabase
    .from('customers')
    .upsert({
      email: customerData.email,
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      stripe_customer_id: customerData.stripe_customer_id,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create/update customer: ${error.message}`)
  }

  return data
}

// Download management
export const createDownloadLinks = async (orderItems, customerEmail) => {
  const downloads = orderItems.map(item => ({
    order_item_id: item.id,
    customer_email: customerEmail,
    product_id: item.product_id,
    download_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download/${item.id}?email=${encodeURIComponent(customerEmail)}`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    download_count: 0,
    created_at: new Date().toISOString()
  }))

  const { data, error } = await supabase
    .from('downloads')
    .insert(downloads)
    .select()

  if (error) {
    throw new Error(`Failed to create download links: ${error.message}`)
  }

  return data
}

export const getDownloadsByEmail = async (email) => {
  const { data, error } = await supabase
    .from('downloads')
    .select(`
      *,
      products (*)
    `)
    .eq('customer_email', email)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch downloads: ${error.message}`)
  }

  return data || []
}

export const updateDownloadCount = async (orderItemId, customerEmail) => {
  const { data, error } = await supabase
    .from('downloads')
    .update({ 
      download_count: supabase.raw('download_count + 1'),
      last_downloaded_at: new Date().toISOString()
    })
    .eq('order_item_id', orderItemId)
    .eq('customer_email', customerEmail)
    .select()

  if (error) {
    throw new Error(`Failed to update download count: ${error.message}`)
  }

  return data
}

export const getDownloadByOrderItem = async (orderItemId, customerEmail) => {
  const { data, error } = await supabase
    .from('downloads')
    .select(`
      *,
      order_items (
        id,
        product_id,
        products (
          title,
          pdf_file_id,
          image_file_id,
          pdf_file:file_uploads!pdf_file_id (
            id,
            file_name,
            storage_path,
            file_type,
            file_size
          ),
          image_file:file_uploads!image_file_id (
            id,
            file_name,
            storage_path,
            file_type,
            file_size
          )
        )
      )
    `)
    .eq('order_item_id', orderItemId)
    .eq('customer_email', customerEmail)
    .single()

  if (error) {
    throw new Error(`Failed to get download: ${error.message}`)
  }

  return data
}

// PDF File Upload Management Functions

export const createFileUpload = async (fileData) => {
  try {
    console.log('[DB-INSERT] Creating file upload record', { 
      fileName: fileData.file_name, 
      fileSize: fileData.file_size,
      fileType: fileData.file_type,
      contentType: fileData.content_type,
      storagePath: fileData.storage_path
    })
    
    // Validate required fields
    if (!fileData.file_name || !fileData.file_size || !fileData.storage_path || !fileData.file_type) {
      throw new Error('Missing required fields: file_name, file_size, file_type, and storage_path are required')
    }
    
    // Validate file type
    if (!['pdf', 'image'].includes(fileData.file_type)) {
      throw new Error('Invalid file_type: must be either "pdf" or "image"')
    }
    
    const insertData = {
      product_id: fileData.product_id || null,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      file_type: fileData.file_type,
      storage_path: fileData.storage_path,
      is_primary: fileData.is_primary || false,
      content_type: fileData.content_type || (fileData.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
      checksum: fileData.checksum,
      processing_status: fileData.processing_status || 'pending',
      created_at: new Date().toISOString()
    }
    
    // Add image-specific fields if it's an image
    if (fileData.file_type === 'image') {
      insertData.color_profile = fileData.color_profile || null
      insertData.orientation = fileData.orientation || null
    }
    
    // Use admin client for file uploads to bypass RLS policies
    const client = supabaseAdmin || supabase
    console.log('[DB-INSERT] Using client:', supabaseAdmin ? 'admin (bypasses RLS)' : 'anon (subject to RLS)')
    
    const { data, error } = await client
      .from('file_uploads')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('[DB-INSERT] Database insert failed', { 
        error: error.message, 
        details: error,
        insertData 
      })
      
      // Provide more specific error messages
      if (error.code === '23505') {
        throw new Error('File with this checksum already exists')
      }
      if (error.code === '23503') {
        throw new Error('Referenced product does not exist')
      }
      if (error.code === '23514') {
        throw new Error('File data violates database constraints')
      }
      if (error.message.includes('permission denied')) {
        throw new Error('Database permission denied for file uploads')
      }
      
      throw new Error(`Failed to create file upload: ${error.message}`)
    }

    console.log('[DB-INSERT] File upload record created successfully', { 
      fileId: data.id, 
      fileName: data.file_name 
    })
    return data
  } catch (error) {
    console.error('[DB-INSERT] Unexpected error creating file upload', { error: error.message })
    throw error
  }
}

export const updateFileProcessingStatus = async (fileId, status, metadata = null) => {
  const updateData = {
    processing_status: status
    // Note: removed updated_at as it's not in the current schema
  }

  if (metadata) {
    updateData.processing_metadata = metadata
  }

  // Use admin client for file updates to bypass RLS policies
  const client = supabaseAdmin || supabase

  const { data, error } = await client
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update file processing status: ${error.message}`)
  }

  return data
}

export const updateFileWithProcessingResults = async (fileId, processingData) => {
  // Use admin client for file updates to bypass RLS policies
  const client = supabaseAdmin || supabase

  const updateData = {
    processing_status: 'completed',
    dimensions: processingData.dimensions,
    thumbnail_urls: processingData.thumbnail_urls,
    processing_metadata: processingData.metadata
  }
  
  // Add PDF-specific fields
  if (processingData.page_count !== undefined) {
    updateData.page_count = processingData.page_count
    updateData.preview_urls = processingData.preview_urls
  }
  
  // Add image-specific fields
  if (processingData.image_variants) {
    updateData.image_variants = processingData.image_variants
  }
  if (processingData.color_profile) {
    updateData.color_profile = processingData.color_profile
  }
  if (processingData.orientation !== undefined) {
    updateData.orientation = processingData.orientation
  }

  const { data, error } = await client
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update file processing results: ${error.message}`)
  }

  return data
}


export const deleteFileUpload = async (fileId) => {
  // Use admin client for file deletion to bypass RLS policies
  const client = supabaseAdmin || supabase

  console.log(`[SUPABASE] Deleting file upload record: ${fileId}`)
  console.log(`[SUPABASE] Using client type: ${client === supabaseAdmin ? 'admin' : 'regular'}`)

  const { data, error } = await client
    .from('file_uploads')
    .delete()
    .eq('id', fileId)
    .select()
    .single()

  if (error) {
    console.error(`[SUPABASE] Database deletion error:`, error)
    throw new Error(`Failed to delete file upload: ${error.message}`)
  }

  console.log(`[SUPABASE] Successfully deleted file upload record: ${data.id}`)
  return data
}

export const getFileUploadsByProduct = async (productId) => {
  // Use admin client for file operations to bypass RLS policies
  const client = supabaseAdmin || supabase
  
  const { data, error } = await client
    .from('file_uploads')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch file uploads: ${error.message}`)
  }

  return data || []
}

export const getFileUploadById = async (fileId) => {
  // Validate UUID format first
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!fileId || typeof fileId !== 'string' || !uuidRegex.test(fileId)) {
    console.log('[DB-QUERY] Invalid UUID format for file ID:', fileId)
    return null
  }

  // Use admin client for file operations to bypass RLS policies
  const client = supabaseAdmin || supabase
  
  const { data, error } = await client
    .from('file_uploads')
    .select('*')
    .eq('id', fileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    // Handle UUID-related errors gracefully
    if (error.message.includes('invalid input syntax for type uuid')) {
      console.log('[DB-QUERY] PostgreSQL UUID error for ID:', fileId)
      return null
    }
    throw new Error(`Failed to fetch file upload: ${error.message}`)
  }

  return data
}

export const validateFileChecksum = async (fileId, expectedChecksum) => {
  const { data, error } = await supabase
    .rpc('validate_file_checksum', {
      file_id: fileId,
      expected_checksum: expectedChecksum
    })

  if (error) {
    throw new Error(`Failed to validate file checksum: ${error.message}`)
  }

  return data
}

export const getProductsWithFiles = async () => {
  const { data, error } = await supabase
    .rpc('get_products_with_files')

  if (error) {
    throw new Error(`Failed to fetch products with files: ${error.message}`)
  }

  return data || []
}

export const cleanupFailedUploads = async () => {
  try {
    console.log('[CLEANUP] Starting cleanup of failed uploads')
    const { data, error } = await supabase
      .rpc('cleanup_failed_uploads')

    if (error) {
      console.error('[CLEANUP] Failed to cleanup failed uploads', { error: error.message })
      throw new Error(`Failed to cleanup failed uploads: ${error.message}`)
    }

    console.log('[CLEANUP] Failed uploads cleanup completed', { cleanedCount: data?.length || 0 })
    return data
  } catch (error) {
    console.error('[CLEANUP] Unexpected error during cleanup', { error: error.message })
    throw error
  }
}

// Enhanced Product Functions with PDF Support

export const createProductWithFile = async (productData, fileId, fileType) => {
  try {
    console.log(`[PRODUCT-${fileType.toUpperCase()}] Creating product with ${fileType}`, { 
      productTitle: productData.title, 
      fileId: fileId 
    })
    
    // Validate that the file exists and is processed
    if (fileId) {
      console.log(`[PRODUCT-${fileType.toUpperCase()}] Validating file existence:`, fileId)
      const fileUpload = await getFileUploadById(fileId)
      
      if (!fileUpload) {
        throw new Error(`${fileType.toUpperCase()} file not found: ${fileId}. Please ensure the file was uploaded successfully.`)
      }
      
      if (fileUpload.file_type !== fileType) {
        throw new Error(`File type mismatch: expected ${fileType}, got ${fileUpload.file_type}`)
      }
      
      if (fileUpload.processing_status !== 'completed') {
        throw new Error(`${fileType.toUpperCase()} file is not ready: status is '${fileUpload.processing_status}'. Please wait for processing to complete.`)
      }
      
      console.log(`[PRODUCT-${fileType.toUpperCase()}] File validation passed`, {
        fileId: fileUpload.id,
        fileName: fileUpload.file_name,
        fileType: fileUpload.file_type,
        status: fileUpload.processing_status
      })
      
      // Update product data to reference the existing file
      if (fileType === 'pdf') {
        productData.pdf_file_id = fileId
      } else if (fileType === 'image') {
        productData.image_file_id = fileId
      }
    }
    
    // Create the product (which will reference the existing file)
    const product = await createProduct(productData)
    console.log(`[PRODUCT-${fileType.toUpperCase()}] Product created successfully`, { 
      productId: product.id, 
      title: product.title,
      linkedFileId: fileType === 'pdf' ? product.pdf_file_id : product.image_file_id
    })
    
    // If we have a file reference, fetch the complete file data for the response
    if (fileId) {
      const fileUpload = await getFileUploadById(fileId)
      return {
        ...product,
        [`${fileType}_file_upload`]: fileUpload
      }
    }
    
    return product
  } catch (error) {
    console.error(`[PRODUCT-${fileType.toUpperCase()}] Failed to create product with ${fileType}`, { 
      error: error.message,
      productTitle: productData.title,
      fileId: fileId
    })
    throw error
  }
}

// Convenience functions for backward compatibility
export const createProductWithPDF = async (productData, fileId) => {
  return await createProductWithFile(productData, fileId, 'pdf')
}

export const createProductWithImage = async (productData, fileId) => {
  return await createProductWithFile(productData, fileId, 'image')
}

export const updateProductWithFileInfo = async (productId, fileData, fileType) => {
  try {
    console.log(`[PRODUCT-UPDATE] Updating product with ${fileType} info`, { productId })
    
    const updateData = {
      file_dimensions: fileData.file_dimensions,
      updated_at: new Date().toISOString()
    }
    
    // Add PDF-specific fields
    if (fileType === 'pdf') {
      updateData.page_count = fileData.page_count
      updateData.print_specifications = fileData.print_specifications
      updateData.preview_pages = fileData.preview_pages
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error(`[PRODUCT-UPDATE] Failed to update product with ${fileType} info`, { 
        productId, 
        error: error.message 
      })
      throw new Error(`Failed to update product with ${fileType} info: ${error.message}`)
    }

    console.log(`[PRODUCT-UPDATE] Product updated with ${fileType} info successfully`, { productId })
    return data
  } catch (error) {
    console.error('[PRODUCT-UPDATE] Unexpected error updating product', { productId, error: error.message })
    throw error
  }
}

// Convenience functions for backward compatibility
export const updateProductWithPDFInfo = async (productId, pdfData) => {
  return await updateProductWithFileInfo(productId, pdfData, 'pdf')
}

export const updateProductWithImageInfo = async (productId, imageData) => {
  return await updateProductWithFileInfo(productId, imageData, 'image')
}

// Storage URL helpers
// Helper functions for image handling

export const getProductImage = (product, variant = 'medium') => {
  try {
    // Early return if product is null or undefined
    if (!product) {
      return null
    }
    
    // Priority 1: Use uploaded image file if available
    if (product.image_file && product.image_file.storage_path) {
      return {
        url: getFileStorageUrl(product.image_file.storage_path),
        source: 'uploaded_image',
        dimensions: product.image_file.dimensions
      }
    }
    
    // Priority 2: Use PDF preview if available and no image file
    if (product.pdf_file && product.pdf_file.processing_status === 'completed') {
      if (product.pdf_file.thumbnail_urls && product.pdf_file.thumbnail_urls[variant]) {
        return {
          url: product.pdf_file.thumbnail_urls[variant],
          source: 'pdf_thumbnail',
          dimensions: product.pdf_file.dimensions
        }
      }
      
      if (product.pdf_file.preview_urls && product.pdf_file.preview_urls.length > 0) {
        return {
          url: product.pdf_file.preview_urls[0],
          source: 'pdf_preview',
          dimensions: product.pdf_file.dimensions
        }
      }
    }
    
    // Priority 3: Fall back to external image URL
    if (product?.image) {
      return {
        url: product.image,
        source: 'external_url'
      }
    }
    
    // No image source found
    return null
  } catch (error) {
    // Keep error logging for debugging critical issues
    console.error('[PRODUCT-IMAGE] Error getting product image:', error.message)
    
    // Fall back to external URL on any error
    if (product?.image) {
      return {
        url: product.image,
        source: 'external_url_fallback'
      }
    }
    
    return null
  }
}

export const getProductImageVariants = (product) => {
  const variants = {}
  
  // Get all available variants from uploaded image
  if (product.image_file && product.image_file.processing_status === 'completed') {
    if (product.image_file.image_variants) {
      Object.keys(product.image_file.image_variants).forEach(variant => {
        variants[variant] = {
          url: product.image_file.image_variants[variant].url,
          width: product.image_file.image_variants[variant].width,
          height: product.image_file.image_variants[variant].height,
          source: 'uploaded'
        }
      })
    }
    
    if (product.image_file.thumbnail_urls) {
      Object.keys(product.image_file.thumbnail_urls).forEach(variant => {
        if (!variants[variant]) {
          variants[variant] = {
            url: product.image_file.thumbnail_urls[variant],
            source: 'uploaded_thumbnail'
          }
        }
      })
    }
  }
  
  // Add PDF thumbnails if no image file variants
  if (Object.keys(variants).length === 0 && product.pdf_file && product.pdf_file.processing_status === 'completed') {
    if (product.pdf_file.thumbnail_urls) {
      Object.keys(product.pdf_file.thumbnail_urls).forEach(variant => {
        variants[variant] = {
          url: product.pdf_file.thumbnail_urls[variant],
          source: 'pdf_thumbnail'
        }
      })
    }
  }
  
  // Always include external URL as fallback
  if (product.image) {
    variants.external = {
      url: product.image,
      source: 'external'
    }
  }
  
  return variants
}

export const getFileStorageUrl = (storagePath) => {
  try {
    const { data } = supabase.storage
      .from('mjk-prints-storage')
      .getPublicUrl(storagePath)
    
    return data.publicUrl
  } catch (error) {
    console.error('[STORAGE-URL] Failed to generate public URL:', error.message)
    throw new Error(`Failed to generate public URL: ${error.message}`)
  }
}

// Image-specific file upload functions

export const createImageUpload = async (imageData) => {
  console.log('[IMAGE-UPLOAD] Creating image upload record', {
    fileName: imageData.file_name,
    fileSize: imageData.file_size,
    contentType: imageData.content_type
  })
  
  const fileData = {
    ...imageData,
    file_type: 'image'
  }
  
  return await createFileUpload(fileData)
}

export const createPDFUpload = async (pdfData) => {
  console.log('[PDF-UPLOAD] Creating PDF upload record', {
    fileName: pdfData.file_name,
    fileSize: pdfData.file_size
  })
  
  const fileData = {
    ...pdfData,
    file_type: 'pdf',
    content_type: 'application/pdf'
  }
  
  return await createFileUpload(fileData)
}

export const updateImageWithProcessingResults = async (fileId, imageProcessingData) => {
  console.log('[IMAGE-PROCESSING] Updating image with processing results', {
    fileId,
    hasVariants: !!imageProcessingData.image_variants,
    colorProfile: imageProcessingData.color_profile
  })
  
  return await updateFileWithProcessingResults(fileId, {
    dimensions: imageProcessingData.dimensions,
    image_variants: imageProcessingData.image_variants,
    thumbnail_urls: imageProcessingData.thumbnail_urls,
    color_profile: imageProcessingData.color_profile,
    orientation: imageProcessingData.orientation,
    metadata: imageProcessingData.metadata
  })
}

export const getFileUploadsByType = async (fileType) => {
  if (!['pdf', 'image'].includes(fileType)) {
    throw new Error('Invalid file type: must be either "pdf" or "image"')
  }
  
  const client = supabaseAdmin || supabase
  
  const { data, error } = await client
    .from('file_uploads')
    .select('*')
    .eq('file_type', fileType)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch ${fileType} uploads: ${error.message}`)
  }

  return data || []
}

export const getProductsWithFileType = async (fileType) => {
  if (!['pdf', 'image'].includes(fileType)) {
    throw new Error('Invalid file type: must be either "pdf" or "image"')
  }
  
  const fileColumn = fileType === 'pdf' ? 'pdf_file_id' : 'image_file_id'
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      file_uploads!${fileColumn} (
        id,
        file_name,
        file_size,
        file_type,
        processing_status,
        dimensions,
        ${fileType === 'pdf' ? 'page_count, preview_urls' : 'image_variants, color_profile, orientation'},
        thumbnail_urls,
        storage_path
      )
    `)
    .not(fileColumn, 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch products with ${fileType} files: ${error.message}`)
  }

  return data || []
}

export const validateFileUpload = async (fileType, contentType, fileSize) => {
  try {
    const { data, error } = await supabase
      .rpc('validate_image_file', {
        p_file_type: fileType,
        p_content_type: contentType,
        p_file_size: fileSize
      })

    if (error) {
      throw new Error(`Validation RPC failed: ${error.message}`)
    }

    return data[0] || { is_valid: false, error_message: 'Unknown validation error' }
  } catch (error) {
    console.error('[FILE-VALIDATION] Validation failed', { error: error.message })
    throw error
  }
}

export const getFileUploadStats = async () => {
  try {
    const { data, error } = await supabase
      .rpc('get_file_upload_stats')

    if (error) {
      throw new Error(`Failed to get file upload stats: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('[FILE-STATS] Failed to get stats', { error: error.message })
    throw error
  }
}

export const uploadFileToStorage = async (file, storagePath, contentType = 'application/pdf') => {
  try {
    // Log upload attempt
    console.log('[STORAGE-UPLOAD] Starting upload', { 
      storagePath, 
      bucketName: 'mjk-prints-storage', 
      contentType 
    })
    
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        duplex: 'half', // Required for stream uploads
        contentType: contentType // Explicitly specify MIME type
      })

    if (error) {
      console.error('[STORAGE-UPLOAD] Upload failed', { 
        storagePath, 
        error: error.message, 
        details: error 
      })
      
      // Provide more specific error messages
      if (error.message.includes('already exists')) {
        throw new Error(`File already exists at path: ${storagePath}`)
      }
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket not found. Please check configuration.')
      }
      if (error.message.includes('Payload too large')) {
        throw new Error('File size exceeds storage limits')
      }
      if (error.message.includes('Invalid file type') || error.message.includes('mime type') || error.message.includes('not supported')) {
        throw new Error(`File type not allowed by storage policy. Detected MIME type: ${contentType}`)
      }
      
      throw new Error(`Failed to upload file to storage: ${error.message}`)
    }

    console.log('[STORAGE-UPLOAD] Upload successful', { 
      storagePath, 
      uploadPath: data.path,
      fullPath: data.fullPath 
    })
    return data
  } catch (error) {
    console.error('[STORAGE-UPLOAD] Unexpected error', { storagePath, error: error.message })
    throw error
  }
}

export const deleteFileFromStorage = async (storagePath) => {
  try {
    console.log('[STORAGE-DELETE] Deleting file from storage', { storagePath })
    
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .remove([storagePath])

    if (error) {
      console.error('[STORAGE-DELETE] Failed to delete file', { 
        storagePath, 
        error: error.message 
      })
      throw new Error(`Failed to delete file from storage: ${error.message}`)
    }

    console.log('[STORAGE-DELETE] File deleted successfully', { 
      storagePath, 
      deletedFiles: data?.length || 0 
    })
    return data
  } catch (error) {
    console.error('[STORAGE-DELETE] Unexpected error deleting file', { 
      storagePath, 
      error: error.message 
    })
    throw error
  }
}

// Comprehensive system health check
export const performSystemHealthCheck = async () => {
  console.log('[SYSTEM-HEALTH] Starting comprehensive system health check')
  
  const healthCheck = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    database: null,
    storage: null,
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  }
  
  try {
    // Run parallel health checks
    const [dbHealth, storageHealth] = await Promise.allSettled([
      performDatabaseHealthCheck(),
      performStorageHealthCheck()
    ])
    
    healthCheck.database = dbHealth.status === 'fulfilled' ? dbHealth.value : { error: dbHealth.reason?.message }
    healthCheck.storage = storageHealth.status === 'fulfilled' ? storageHealth.value : { error: storageHealth.reason?.message }
    
    // Determine overall health
    const dbHealthy = healthCheck.database?.connection && healthCheck.database?.permissions?.read
    const storageHealthy = healthCheck.storage?.bucketExists && healthCheck.storage?.canList
    const envHealthy = healthCheck.environment.hasSupabaseUrl && healthCheck.environment.hasSupabaseKey
    
    if (dbHealthy && storageHealthy && envHealthy) {
      healthCheck.overall = 'healthy'
    } else if (dbHealthy || storageHealthy) {
      healthCheck.overall = 'degraded'
    } else {
      healthCheck.overall = 'unhealthy'
    }
    
    console.log('[SYSTEM-HEALTH] System health check completed', { 
      overall: healthCheck.overall,
      dbHealthy,
      storageHealthy,
      envHealthy
    })
    
    return healthCheck
  } catch (error) {
    console.error('[SYSTEM-HEALTH] System health check failed', { error: error.message })
    healthCheck.overall = 'error'
    healthCheck.error = error.message
    return healthCheck
  }
}

// Storage Setup and Diagnostics Functions

export const verifyStorageSetup = async () => {
  try {
    console.log('[STORAGE-VERIFY] Verifying storage setup via RPC')
    const { data, error } = await supabase
      .rpc('verify_storage_setup')

    if (error) {
      console.error('[STORAGE-VERIFY] RPC call failed', { error: error.message })
      throw new Error(`Failed to verify storage setup: ${error.message}`)
    }

    console.log('[STORAGE-VERIFY] Storage setup verification completed', { result: data })
    return data || []
  } catch (error) {
    console.error('[STORAGE-VERIFY] Unexpected error verifying storage setup', { error: error.message })
    throw error
  }
}

export const getStorageStats = async () => {
  try {
    console.log('[STORAGE-STATS] Retrieving storage statistics')
    const { data, error } = await supabase
      .rpc('get_storage_stats')

    if (error) {
      console.error('[STORAGE-STATS] Failed to get storage stats', { error: error.message })
      throw new Error(`Failed to get storage stats: ${error.message}`)
    }

    console.log('[STORAGE-STATS] Storage stats retrieved', { statsCount: data?.length || 0 })
    return data || []
  } catch (error) {
    console.error('[STORAGE-STATS] Unexpected error getting storage stats', { error: error.message })
    throw error
  }
}

export const checkStorageBucketExists = async () => {
  try {
    console.log('[STORAGE-CHECK] Checking bucket existence')
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .list('', { limit: 1 })
    
    if (error) {
      console.error('[STORAGE-CHECK] Bucket check failed', { error: error.message })
      return false
    }
    
    console.log('[STORAGE-CHECK] Bucket check successful')
    return true
  } catch (error) {
    console.error('[STORAGE-CHECK] Unexpected error during bucket check', { error: error.message })
    return false
  }
}

export const getStorageBucketInfo = async () => {
  try {
    console.log('[STORAGE-INFO] Retrieving bucket information')
    const { data: buckets, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('[STORAGE-INFO] Failed to list buckets', { error: error.message })
      throw new Error(`Failed to list buckets: ${error.message}`)
    }
    
    const bucket = buckets.find(b => b.id === 'mjk-prints-storage')
    
    if (bucket) {
      console.log('[STORAGE-INFO] Bucket found', { 
        bucketId: bucket.id, 
        public: bucket.public,
        createdAt: bucket.created_at 
      })
    } else {
      console.warn('[STORAGE-INFO] Bucket not found in list', { 
        availableBuckets: buckets.map(b => b.id) 
      })
    }
    
    return bucket || null
  } catch (error) {
    console.error('[STORAGE-INFO] Unexpected error getting bucket info', { error: error.message })
    throw new Error(`Failed to get bucket info: ${error.message}`)
  }
}

// Transaction-based file upload with rollback capability
export const createFileUploadWithTransaction = async (fileData, uploadFunction) => {
  let uploadResult = null
  let dbRecord = null
  
  try {
    console.log('[TRANSACTION] Starting file upload transaction', { fileName: fileData.file_name })
    
    // Step 1: Upload to storage
    console.log('[TRANSACTION] Step 1: Uploading to storage')
    uploadResult = await uploadFunction()
    
    // Step 2: Create database record
    console.log('[TRANSACTION] Step 2: Creating database record')
    dbRecord = await createFileUpload(fileData)
    
    console.log('[TRANSACTION] Transaction completed successfully', { 
      fileId: dbRecord.id, 
      storagePath: uploadResult.path 
    })
    
    return {
      fileUpload: dbRecord,
      storageResult: uploadResult
    }
  } catch (error) {
    console.error('[TRANSACTION] Transaction failed, attempting rollback', { 
      error: error.message,
      hasUploadResult: !!uploadResult,
      hasDbRecord: !!dbRecord
    })
    
    // Rollback: Delete uploaded file if database creation failed
    if (uploadResult && !dbRecord) {
      try {
        console.log('[TRANSACTION] Rolling back storage upload')
        await deleteFileFromStorage(fileData.storage_path)
        console.log('[TRANSACTION] Storage rollback completed')
      } catch (rollbackError) {
        console.error('[TRANSACTION] Storage rollback failed', { 
          rollbackError: rollbackError.message 
        })
        // Continue throwing original error even if rollback fails
      }
    }
    
    // Rollback: Delete database record if it was created but something else failed
    if (dbRecord) {
      try {
        console.log('[TRANSACTION] Rolling back database record')
        await supabase.from('file_uploads').delete().eq('id', dbRecord.id)
        console.log('[TRANSACTION] Database rollback completed')
      } catch (rollbackError) {
        console.error('[TRANSACTION] Database rollback failed', { 
          rollbackError: rollbackError.message 
        })
      }
    }
    
    throw error
  }
}

// Get product files for email attachment
export const getProductFilesForAttachment = async (orderItems) => {
  const attachmentFiles = []
  
  try {
    console.log('[ATTACHMENT] Retrieving files for email attachment', { orderItemCount: orderItems.length })
    
    for (const item of orderItems) {
      const product = item.products
      if (!product) {
        console.warn('[ATTACHMENT] No product data for order item:', item.id)
        continue
      }
      
      let fileToAttach = null
      
      // Prefer PDF files over images for digital planners
      if (product.pdf_file && product.pdf_file.storage_path) {
        fileToAttach = product.pdf_file
        console.log('[ATTACHMENT] Found PDF file for product:', product.title)
      } else if (product.image_file && product.image_file.storage_path) {
        fileToAttach = product.image_file
        console.log('[ATTACHMENT] Found image file for product:', product.title)
      }
      
      if (!fileToAttach) {
        console.warn('[ATTACHMENT] No downloadable file found for product:', product.title)
        continue
      }
      
      // Check file size (MailerSend limit is 25MB)
      const fileSizeBytes = fileToAttach.file_size || 0
      const fileSizeMB = fileSizeBytes / (1024 * 1024)
      
      if (fileSizeMB > 25) {
        console.warn('[ATTACHMENT] File too large for email attachment', {
          product: product.title,
          sizeMB: fileSizeMB.toFixed(2),
          limit: '25MB'
        })
        continue
      }
      
      try {
        // Download file from Supabase Storage
        console.log('[ATTACHMENT] Downloading file from storage:', fileToAttach.storage_path)
        const { data: fileData, error: fileError } = await supabase.storage
          .from('mjk-prints-storage')
          .download(fileToAttach.storage_path)
          
        if (fileError || !fileData) {
          console.error('[ATTACHMENT] Failed to download file from storage:', {
            path: fileToAttach.storage_path,
            error: fileError?.message
          })
          continue
        }
        
        // Convert to buffer then to base64
        const arrayBuffer = await fileData.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Content = buffer.toString('base64')
        
        // Determine content type and filename
        let contentType = 'application/pdf'
        let filename = fileToAttach.file_name || `${product.title}.pdf`
        
        if (fileToAttach.file_type === 'image') {
          contentType = fileToAttach.content_type || 'image/jpeg'
          if (!filename.includes('.')) {
            const ext = contentType.split('/')[1] || 'jpg'
            filename = `${product.title}.${ext}`
          }
        }
        
        attachmentFiles.push({
          content: base64Content,
          filename: filename,
          type: contentType,
          disposition: 'attachment',
          productTitle: product.title,
          fileSize: fileSizeBytes
        })
        
        console.log('[ATTACHMENT] Successfully prepared file for attachment:', {
          filename,
          contentType,
          sizeMB: fileSizeMB.toFixed(2)
        })
        
      } catch (downloadError) {
        console.error('[ATTACHMENT] Error processing file for attachment:', {
          product: product.title,
          error: downloadError.message
        })
        continue
      }
    }
    
    console.log('[ATTACHMENT] File retrieval completed', { 
      totalItems: orderItems.length, 
      attachmentFiles: attachmentFiles.length 
    })
    
    return attachmentFiles
    
  } catch (error) {
    console.error('[ATTACHMENT] Failed to retrieve product files for attachment:', error.message)
    return []
  }
}

// Enhanced health check function
export const performDatabaseHealthCheck = async () => {
  const healthStatus = {
    connection: false,
    tables: {
      file_uploads: false,
      products: false,
      orders: false
    },
    permissions: {
      read: false,
      write: false
    },
    timestamp: new Date().toISOString()
  }
  
  try {
    console.log('[HEALTH-CHECK] Starting database health check')
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('file_uploads')
      .select('id')
      .limit(1)
    
    if (!connectionError) {
      healthStatus.connection = true
      healthStatus.tables.file_uploads = true
      healthStatus.permissions.read = true
      console.log('[HEALTH-CHECK] Basic connection and read permissions OK')
    } else {
      console.error('[HEALTH-CHECK] Connection or read test failed', { error: connectionError.message })
    }
    
    // Test write permissions with a dry run
    try {
      const testInsert = {
        file_name: 'health-check-test.pdf',
        file_size: 1024,
        file_type: 'pdf',
        storage_path: 'health-check/test.pdf',
        content_type: 'application/pdf',
        processing_status: 'pending'
      }
      
      // Use a transaction that we immediately roll back
      const { data: insertTest, error: insertError } = await supabase
        .from('file_uploads')
        .insert([testInsert])
        .select()
        .single()
      
      if (!insertError && insertTest) {
        healthStatus.permissions.write = true
        console.log('[HEALTH-CHECK] Write permissions OK')
        
        // Clean up test record
        await supabase.from('file_uploads').delete().eq('id', insertTest.id)
        console.log('[HEALTH-CHECK] Test record cleaned up')
      } else {
        console.error('[HEALTH-CHECK] Write test failed', { error: insertError?.message })
      }
    } catch (writeError) {
      console.error('[HEALTH-CHECK] Write permission test error', { error: writeError.message })
    }
    
    // Test other critical tables
    const tables = ['products', 'orders']
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1)
        if (!error) {
          healthStatus.tables[table] = true
          console.log(`[HEALTH-CHECK] Table ${table} accessible`)
        } else {
          console.error(`[HEALTH-CHECK] Table ${table} not accessible`, { error: error.message })
        }
      } catch (tableError) {
        console.error(`[HEALTH-CHECK] Error checking table ${table}`, { error: tableError.message })
      }
    }
    
    console.log('[HEALTH-CHECK] Database health check completed', healthStatus)
    return healthStatus
  } catch (error) {
    console.error('[HEALTH-CHECK] Database health check failed', { error: error.message })
    return healthStatus
  }
}

// Storage health check
export const performStorageHealthCheck = async () => {
  const healthStatus = {
    bucketExists: false,
    canList: false,
    canUpload: false,
    canDelete: false,
    bucketInfo: null,
    timestamp: new Date().toISOString()
  }
  
  try {
    console.log('[STORAGE-HEALTH] Starting storage health check')
    
    // Check if bucket exists
    healthStatus.bucketExists = await checkStorageBucketExists()
    
    if (healthStatus.bucketExists) {
      healthStatus.canList = true
      
      // Get bucket info
      try {
        healthStatus.bucketInfo = await getStorageBucketInfo()
      } catch (infoError) {
        console.warn('[STORAGE-HEALTH] Could not retrieve bucket info', { error: infoError.message })
      }
      
      // Test upload/delete with a tiny test file
      const testPath = `health-check/test-${Date.now()}.txt`
      const testContent = new Blob(['health-check'], { type: 'text/plain' })
      
      try {
        // Test upload
        const uploadResult = await uploadFileToStorage(testContent, testPath, 'text/plain')
        if (uploadResult) {
          healthStatus.canUpload = true
          console.log('[STORAGE-HEALTH] Upload test successful')
          
          // Test delete
          try {
            await deleteFileFromStorage(testPath)
            healthStatus.canDelete = true
            console.log('[STORAGE-HEALTH] Delete test successful')
          } catch (deleteError) {
            console.error('[STORAGE-HEALTH] Delete test failed', { error: deleteError.message })
          }
        }
      } catch (uploadError) {
        console.error('[STORAGE-HEALTH] Upload test failed', { error: uploadError.message })
      }
    }
    
    console.log('[STORAGE-HEALTH] Storage health check completed', healthStatus)
    return healthStatus
  } catch (error) {
    console.error('[STORAGE-HEALTH] Storage health check failed', { error: error.message })
    return healthStatus
  }
}