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
      file_uploads!pdf_file_id (
        id,
        file_name,
        file_size,
        processing_status,
        preview_urls,
        thumbnail_urls,
        dimensions,
        page_count
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return data || []
}

export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      file_uploads!pdf_file_id (
        id,
        file_name,
        file_size,
        processing_status,
        preview_urls,
        thumbnail_urls,
        dimensions,
        page_count,
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
  // Use admin client to bypass RLS policies for product updates
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[PRODUCT-UPDATE] No service role key configured, using anon client (may fail due to RLS)')
  }
  
  const { data, error } = await client
    .from('products')
    .update({
      title: productData.title,
      description: productData.description,
      price: productData.price,
      image: productData.image,
      pdf_file_id: productData.pdf_file_id || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return data
}

export const deleteProduct = async (id) => {
  // Use admin client to bypass RLS policies for product deletion
  const client = supabaseAdmin || supabase
  
  if (!supabaseAdmin) {
    console.warn('[PRODUCT-DELETE] No service role key configured, using anon client (may fail due to RLS)')
  }
  
  const { data, error } = await client
    .from('products')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`)
  }

  return data
}

// Order management functions
export const createOrder = async (orderData) => {
  const { data, error } = await supabase
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
  const orderItems = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity
  }))

  const { data, error } = await supabase
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
    download_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download/${item.id}`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
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

// PDF File Upload Management Functions

export const createFileUpload = async (fileData) => {
  try {
    console.log('[DB-INSERT] Creating file upload record', { 
      fileName: fileData.file_name, 
      fileSize: fileData.file_size,
      storagePath: fileData.storage_path
    })
    
    // Validate required fields
    if (!fileData.file_name || !fileData.file_size || !fileData.storage_path) {
      throw new Error('Missing required fields: file_name, file_size, and storage_path are required')
    }
    
    const insertData = {
      product_id: fileData.product_id || null,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      file_type: fileData.file_type || 'pdf',
      storage_path: fileData.storage_path,
      is_primary: fileData.is_primary || false,
      content_type: fileData.content_type || 'application/pdf',
      checksum: fileData.checksum,
      processing_status: 'pending',
      created_at: new Date().toISOString()
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

  const { data, error } = await client
    .from('file_uploads')
    .update({
      processing_status: 'completed',
      page_count: processingData.page_count,
      dimensions: processingData.dimensions,
      preview_urls: processingData.preview_urls,
      thumbnail_urls: processingData.thumbnail_urls,
      processing_metadata: processingData.metadata
    })
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

  const { data, error } = await client
    .from('file_uploads')
    .delete()
    .eq('id', fileId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to delete file upload: ${error.message}`)
  }

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

export const createProductWithPDF = async (productData, fileId) => {
  try {
    console.log('[PRODUCT-PDF] Creating product with PDF', { 
      productTitle: productData.title, 
      fileId: fileId 
    })
    
    // Validate that the file exists and is processed
    if (fileId) {
      console.log('[PRODUCT-PDF] Validating file existence:', fileId)
      const fileUpload = await getFileUploadById(fileId)
      
      if (!fileUpload) {
        throw new Error(`PDF file not found: ${fileId}. Please ensure the file was uploaded successfully.`)
      }
      
      if (fileUpload.processing_status !== 'completed') {
        throw new Error(`PDF file is not ready: status is '${fileUpload.processing_status}'. Please wait for processing to complete.`)
      }
      
      console.log('[PRODUCT-PDF] File validation passed', {
        fileId: fileUpload.id,
        fileName: fileUpload.file_name,
        status: fileUpload.processing_status
      })
      
      // Update product data to reference the existing file
      productData.pdf_file_id = fileId
    }
    
    // Create the product (which will reference the existing file)
    const product = await createProduct(productData)
    console.log('[PRODUCT-PDF] Product created successfully', { 
      productId: product.id, 
      title: product.title,
      linkedFileId: product.pdf_file_id
    })
    
    // If we have a file reference, fetch the complete file data for the response
    if (fileId) {
      const fileUpload = await getFileUploadById(fileId)
      return {
        ...product,
        file_upload: fileUpload
      }
    }
    
    return product
  } catch (error) {
    console.error('[PRODUCT-PDF] Failed to create product with PDF', { 
      error: error.message,
      productTitle: productData.title,
      fileId: fileId
    })
    throw error
  }
}

export const updateProductWithPDFInfo = async (productId, pdfData) => {
  try {
    console.log('[PRODUCT-UPDATE] Updating product with PDF info', { productId })
    
    const { data, error } = await supabase
      .from('products')
      .update({
        page_count: pdfData.page_count,
        file_dimensions: pdfData.file_dimensions,
        print_specifications: pdfData.print_specifications,
        preview_pages: pdfData.preview_pages,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      console.error('[PRODUCT-UPDATE] Failed to update product with PDF info', { 
        productId, 
        error: error.message 
      })
      throw new Error(`Failed to update product with PDF info: ${error.message}`)
    }

    console.log('[PRODUCT-UPDATE] Product updated with PDF info successfully', { productId })
    return data
  } catch (error) {
    console.error('[PRODUCT-UPDATE] Unexpected error updating product', { productId, error: error.message })
    throw error
  }
}

// Storage URL helpers
export const getFileStorageUrl = (storagePath) => {
  try {
    console.log('[STORAGE-URL] Getting public URL for file', { storagePath })
    const { data } = supabase.storage
      .from('mjk-prints-storage')
      .getPublicUrl(storagePath)
    
    console.log('[STORAGE-URL] Public URL generated', { storagePath, publicUrl: data.publicUrl })
    return data.publicUrl
  } catch (error) {
    console.error('[STORAGE-URL] Failed to generate public URL', { storagePath, error: error.message })
    throw new Error(`Failed to generate public URL: ${error.message}`)
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
        file_name: 'health-check-test',
        file_size: 0,
        file_type: 'test',
        storage_path: 'test/health-check',
        content_type: 'application/test',
        processing_status: 'test'
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