import formidable from 'formidable'
import { readFileSync, createReadStream, unlinkSync } from 'fs'
import { fileTypeFromBuffer } from 'file-type'
import crypto from 'crypto'
import pdfParse from 'pdf-parse'
import { createFileUpload, uploadFileToStorage, performStorageHealthCheck } from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

// Configure Next.js to disable bodyParser for this route
export const config = {
  api: {
    bodyParser: false
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
const ALLOWED_MIME_TYPES = ['application/pdf']
const UPLOAD_DIR = '/tmp' // Use system temp directory

// Logging utility for better debugging
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    level,
    message,
    requestId: data.requestId || 'unknown',
    ...data
  }
  
  if (level === 'error') {
    console.error(`[PDF-UPLOAD-${level.toUpperCase()}]`, JSON.stringify(logEntry, null, 2))
  } else {
  }
}

// Security validation for PDF files
const validatePDFStructure = async (filePath) => {
  try {
    const buffer = readFileSync(filePath)
    
    // Check file signature (PDF magic bytes)
    const pdfSignature = buffer.slice(0, 4).toString()
    if (pdfSignature !== '%PDF') {
      throw new Error('Invalid PDF file signature')
    }

    // Basic PDF parsing to ensure structure is valid
    const pdfData = await pdfParse(buffer)
    
    if (!pdfData.numpages || pdfData.numpages <= 0) {
      throw new Error('PDF contains no valid pages')
    }

    return {
      isValid: true,
      pageCount: pdfData.numpages,
      metadata: {
        title: pdfData.info?.Title || null,
        author: pdfData.info?.Author || null,
        creator: pdfData.info?.Creator || null,
        producer: pdfData.info?.Producer || null,
        creationDate: pdfData.info?.CreationDate || null,
        modificationDate: pdfData.info?.ModDate || null
      }
    }
  } catch (error) {
    console.error('PDF validation error:', error)
    return {
      isValid: false,
      error: error.message
    }
  }
}

// Generate file checksum for integrity verification
const generateChecksum = (filePath) => {
  try {
    const buffer = readFileSync(filePath)
    return crypto.createHash('sha256').update(buffer).digest('hex')
  } catch (error) {
    throw new Error(`Failed to generate file checksum: ${error.message}`)
  }
}

// Cleanup temporary files safely
const cleanupTempFile = (filePath, requestId) => {
  try {
    if (filePath) {
      unlinkSync(filePath)
      log('info', 'Temporary file cleaned up', { requestId, filePath })
    }
  } catch (error) {
    log('warn', 'Failed to cleanup temporary file', { requestId, filePath, error: error.message })
  }
}

// Health check functions
const performHealthChecks = async (requestId) => {
  const checks = {
    environment: false,
    database: false,
    storage: false
  }
  
  try {
    // Check environment variables
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      checks.environment = true
      log('info', 'Environment variables check passed', { requestId })
    } else {
      log('error', 'Missing required environment variables', { requestId })
    }
    
    // Check storage bucket exists
    const healthChecks = await performStorageHealthCheck(requestId)
    if (healthChecks.bucketExists) {
      checks.storage = true
      log('info', 'Storage bucket check passed', { requestId })
      
      // Get bucket info for additional diagnostics
      try {
        const bucketInfo = healthChecks.bucketInfo
        log('info', 'Storage bucket info retrieved', { requestId, bucketInfo })
      } catch (error) {
        log('warn', 'Could not retrieve bucket info', { requestId, error: error.message })
      }
    } else {
      log('error', 'Storage bucket not accessible', { requestId, details: healthChecks.message })
    }
    
    // Database connection will be tested during actual operations
    checks.database = true // We'll verify this during createFileUpload
    
    return checks
  } catch (error) {
    log('error', 'Health check failed', { requestId, error: error.message })
    return checks
  }
}

// Rate limiting helper (simple in-memory store for production should use Redis)
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5 // 5 uploads per minute per IP

const checkRateLimit = (ip) => {
  const now = Date.now()
  const key = `upload_${ip}`
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  const entry = rateLimitStore.get(key)
  
  if (now > entry.resetTime) {
    // Reset the window
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 }
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      remaining: 0,
      resetTime: entry.resetTime 
    }
  }
  
  entry.count++
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count 
  }
}

export default async function handler(req, res) {
  // Generate request ID for tracking
  const requestId = crypto.randomBytes(8).toString('hex')
  const startTime = Date.now()
  
  log('info', 'PDF upload request started', { 
    requestId, 
    method: req.method,
    userAgent: req.headers['user-agent'],
    contentLength: req.headers['content-length']
  })

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    log('warn', 'Invalid method attempted', { requestId, method: req.method })
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authentication check for admin uploads
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      log('warn', 'Unauthenticated upload attempt', { requestId })
      return // Response already sent by verifyAdminSession
    }
    log('info', 'Authentication successful', { requestId })
  } catch (error) {
    log('error', 'Authentication error', { requestId, error: error.message })
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown'

  log('info', 'Client IP identified', { requestId, clientIP })
  const rateLimit = checkRateLimit(clientIP)
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS)
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
  
  if (!rateLimit.allowed) {
    res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())
    log('warn', 'Rate limit exceeded', { requestId, clientIP, remaining: rateLimit.remaining })
    return res.status(429).json({ 
      error: 'Too many upload requests',
      details: `Maximum ${RATE_LIMIT_MAX_REQUESTS} uploads per minute allowed`
    })
  }

  let tempFilePath = null

  try {
    // Perform health checks before processing
    log('info', 'Performing health checks', { requestId })
    const healthChecks = await performHealthChecks(requestId)
    
    if (!healthChecks.environment) {
      log('error', 'Environment health check failed', { requestId })
      return res.status(500).json({ 
        error: 'Service configuration error',
        details: 'Upload service is not properly configured'
      })
    }
    
    if (!healthChecks.storage) {
      log('error', 'Storage health check failed', { requestId })
      return res.status(500).json({ 
        error: 'Storage service unavailable',
        details: 'File storage is currently unavailable. Please try again later.'
      })
    }
    
    log('info', 'Health checks passed, proceeding with upload', { requestId })

    // Parse multipart form data
    log('info', 'Parsing multipart form data', { requestId })
    const form = formidable({
      uploadDir: UPLOAD_DIR,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
      multiples: false,
      filename: (name, ext, part) => {
        // Generate secure filename
        const timestamp = Date.now()
        const randomBytes = crypto.randomBytes(8).toString('hex')
        return `pdf_${timestamp}_${randomBytes}${ext}`
      }
    })

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          log('error', 'Form parsing failed', { requestId, error: err.message })
          reject(err)
        } else {
          log('info', 'Form parsing completed', { 
            requestId, 
            fieldCount: Object.keys(fields).length,
            fileCount: Object.keys(files).length
          })
          resolve([fields, files])
        }
      })
    })

    // Extract file from parsed data
    const pdfFile = files.pdf || files.file
    if (!pdfFile) {
      log('error', 'No file provided in request', { requestId, availableFields: Object.keys(files) })
      return res.status(400).json({ 
        error: 'No PDF file provided',
        details: 'Please upload a PDF file using the "pdf" or "file" field'
      })
    }

    const file = Array.isArray(pdfFile) ? pdfFile[0] : pdfFile
    tempFilePath = file.filepath
    
    log('info', 'File extracted from form data', { 
      requestId, 
      fileName: file.originalFilename,
      fileSize: file.size,
      mimeType: file.mimetype,
      tempPath: file.filepath
    })

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      log('warn', 'File size validation failed', { 
        requestId, 
        fileSize: file.size, 
        maxSize: MAX_FILE_SIZE,
        fileName: file.originalFilename
      })
      cleanupTempFile(tempFilePath, requestId)
      return res.status(400).json({ 
        error: 'File too large',
        details: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      })
    }

    // Validate file type using file-type library for better security
    log('info', 'Validating file type', { requestId })
    let buffer, fileType
    try {
      buffer = readFileSync(file.filepath)
      fileType = await fileTypeFromBuffer(buffer)
      
      log('info', 'File type detection completed', { 
        requestId, 
        detectedType: fileType?.mime,
        detectedExt: fileType?.ext
      })
    } catch (error) {
      log('error', 'File type validation failed', { requestId, error: error.message })
      cleanupTempFile(tempFilePath, requestId)
      return res.status(400).json({ 
        error: 'File validation error',
        details: 'Unable to validate file type'
      })
    }
    
    if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      log('warn', 'Invalid file type detected', { 
        requestId, 
        detectedType: fileType?.mime,
        allowedTypes: ALLOWED_MIME_TYPES
      })
      cleanupTempFile(tempFilePath, requestId)
      return res.status(400).json({ 
        error: 'Invalid file type',
        details: 'Only PDF files are allowed'
      })
    }

    // Validate PDF structure and extract basic metadata
    log('info', 'Validating PDF structure', { requestId })
    const pdfValidation = await validatePDFStructure(file.filepath)
    if (!pdfValidation.isValid) {
      log('warn', 'PDF structure validation failed', { 
        requestId, 
        validationError: pdfValidation.error
      })
      cleanupTempFile(tempFilePath, requestId)
      return res.status(400).json({ 
        error: 'Invalid PDF file',
        details: pdfValidation.error
      })
    }
    
    log('info', 'PDF validation successful', { 
      requestId, 
      pageCount: pdfValidation.pageCount,
      hasMetadata: !!pdfValidation.metadata
    })

    // Generate file checksum for integrity verification
    log('info', 'Generating file checksum', { requestId })
    let checksum
    try {
      checksum = generateChecksum(file.filepath)
      log('info', 'Checksum generated successfully', { requestId, checksum: checksum.substring(0, 16) + '...' })
    } catch (error) {
      log('error', 'Checksum generation failed', { requestId, error: error.message })
      cleanupTempFile(tempFilePath, requestId)
      return res.status(500).json({ 
        error: 'File processing error',
        details: 'Unable to process file integrity check'
      })
    }

    // Generate storage path
    const timestamp = Date.now()
    const fileExtension = file.originalFilename ? 
      file.originalFilename.split('.').pop().toLowerCase() : 'pdf'
    const storagePath = `pdfs/${timestamp}_${crypto.randomBytes(8).toString('hex')}.${fileExtension}`
    
    log('info', 'Generated storage path', { requestId, storagePath })

    // Upload to Supabase Storage with retry logic
    log('info', 'Starting storage upload', { 
      requestId, 
      storagePath, 
      detectedMimeType: fileType.mime,
      originalMimeType: file.mimetype
    })
    let uploadResult
    const maxRetries = 3
    let retryCount = 0
    
    while (retryCount < maxRetries) {
      try {
        const fileStream = createReadStream(file.filepath)
        // Pass the validated MIME type from file-type detection
        uploadResult = await uploadFileToStorage(fileStream, storagePath, fileType.mime)
        log('info', 'Storage upload successful', { 
          requestId, 
          storagePath, 
          uploadPath: uploadResult.path,
          mimeType: fileType.mime,
          attempt: retryCount + 1
        })
        break
      } catch (error) {
        retryCount++
        log('error', 'Storage upload failed', { 
          requestId, 
          storagePath, 
          attempt: retryCount,
          error: error.message,
          detectedMimeType: fileType.mime,
          originalMimeType: file.mimetype,
          willRetry: retryCount < maxRetries
        })
        
        if (retryCount >= maxRetries) {
          cleanupTempFile(tempFilePath, requestId)
          return res.status(500).json({ 
            error: 'Storage upload failed',
            details: `Unable to save file to storage after multiple attempts. MIME type detected: ${fileType.mime}. Error: ${error.message}`
          })
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }

    // Create file upload record in database
    log('info', 'Creating database record', { requestId })
    let fileUpload
    try {
      fileUpload = await createFileUpload({
        file_name: file.originalFilename || 'untitled.pdf',
        file_size: file.size,
        file_type: 'pdf',
        content_type: fileType.mime,
        storage_path: storagePath,
        checksum: checksum,
        is_primary: true
      })
      
      log('info', 'Database record created successfully', { 
        requestId, 
        fileId: fileUpload.id,
        fileName: fileUpload.file_name
      })
    } catch (error) {
      log('error', 'Database record creation failed', { requestId, error: error.message })
      
      // Attempt to cleanup uploaded file from storage
      try {
        const { deleteFileFromStorage } = await import('../../../lib/supabase')
        await deleteFileFromStorage(storagePath)
        log('info', 'Cleaned up storage file after database failure', { requestId, storagePath })
      } catch (cleanupError) {
        log('error', 'Failed to cleanup storage file', { requestId, cleanupError: cleanupError.message })
      }
      
      cleanupTempFile(tempFilePath, requestId)
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Unable to create file record. Please try again.'
      })
    }

    // Cleanup temporary file
    cleanupTempFile(tempFilePath, requestId)
    
    const processingTime = Date.now() - startTime
    
    // Log successful upload
    log('info', 'PDF upload completed successfully', {
      requestId,
      fileId: fileUpload.id,
      fileName: file.originalFilename,
      fileSize: file.size,
      pageCount: pdfValidation.pageCount,
      storagePath: storagePath,
      processingTimeMs: processingTime
    })

    // Return success response
    res.status(200).json({
      success: true,
      message: 'PDF uploaded successfully',
      file: {
        id: fileUpload.id,
        fileName: fileUpload.file_name,
        fileSize: fileUpload.file_size,
        pageCount: pdfValidation.pageCount,
        checksum: checksum,
        processingStatus: 'pending',
        uploadedAt: fileUpload.created_at,
        metadata: pdfValidation.metadata,
        processingTime: processingTime
      }
    })

  } catch (error) {
    const processingTime = Date.now() - startTime
    
    // Cleanup temporary file if it exists
    cleanupTempFile(tempFilePath, requestId)
    
    log('error', 'PDF upload failed with unhandled error', {
      requestId,
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime
    })

    // Handle specific error types
    if (error.code === 'LIMIT_FILE_SIZE') {
      log('warn', 'File size limit exceeded in formidable', { requestId, maxSize: MAX_FILE_SIZE })
      return res.status(400).json({ 
        error: 'File too large',
        details: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      })
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      log('warn', 'File count limit exceeded', { requestId })
      return res.status(400).json({ 
        error: 'Too many files',
        details: 'Only one file can be uploaded at a time'
      })
    }

    if (error.code === 'LIMIT_FIELD_COUNT') {
      log('warn', 'Field count limit exceeded', { requestId })
      return res.status(400).json({ 
        error: 'Too many form fields',
        details: 'Request contains too many form fields'
      })
    }

    if (error.message.includes('Failed to upload file to storage')) {
      // Check if it's a MIME type issue
      if (error.message.includes('mime type') || error.message.includes('not supported')) {
        return res.status(400).json({ 
          error: 'File type not supported',
          details: `The PDF file's MIME type is not supported by the storage system. Please ensure you're uploading a valid PDF file.`
        })
      }
      return res.status(500).json({ 
        error: 'Storage upload failed',
        details: 'Unable to save file to storage. Please try again.'
      })
    }

    if (error.message.includes('Failed to create file upload')) {
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Unable to create file record. Please try again.'
      })
    }

    if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      return res.status(500).json({ 
        error: 'File processing error',
        details: 'Temporary file was lost during processing. Please try again.'
      })
    }

    if (error.message.includes('ENOSPC')) {
      return res.status(500).json({ 
        error: 'Server storage full',
        details: 'Server temporary storage is full. Please try again later.'
      })
    }

    // Generic error response with request ID for support
    res.status(500).json({ 
      error: 'Upload failed',
      details: 'An unexpected error occurred during file upload',
      requestId: requestId
    })
  }
}