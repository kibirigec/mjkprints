import { 
  getFileUploadById,
  updateFileProcessingStatus,
  deleteFileUpload,
  deleteFileFromStorage,
  supabase,
  supabaseAdmin
} from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  const { method, query } = req
  const { id } = query

  if (!id) {
    return res.status(400).json({ error: 'File ID is required' })
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid file ID format. Expected UUID.' })
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
        const file = await getFileUploadById(id)
        
        if (!file) {
          return res.status(404).json({ error: 'File not found' })
        }
        
        res.status(200).json(file)
        break

      case 'PUT':
        try {
          const { processing_status, processing_metadata } = req.body

          if (!processing_status) {
            return res.status(400).json({ 
              error: 'Processing status is required' 
            })
          }

          // Check if file exists first
          const existingFile = await getFileUploadById(id)
          if (!existingFile) {
            return res.status(404).json({ error: 'File not found' })
          }

          const updatedFile = await updateFileProcessingStatus(
            id, 
            processing_status, 
            processing_metadata
          )

          res.status(200).json(updatedFile)
        } catch (error) {
          console.error('Update file error:', error)
          res.status(500).json({ 
            error: 'Failed to update file',
            details: error.message 
          })
        }
        break

      case 'DELETE':
        try {
          console.log(`[FILE-DELETE] Starting deletion for file ID: ${id}`)
          
          // Check environment configuration first
          if (!supabaseAdmin) {
            console.error('[FILE-DELETE] CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
            console.error('[FILE-DELETE] Admin operations require service role key for RLS bypass')
            return res.status(500).json({ 
              error: 'Server configuration error',
              details: 'File deletion requires admin privileges. Please contact support.'
            })
          }

          // Check if file exists first
          const existingFile = await getFileUploadById(id)
          if (!existingFile) {
            console.log(`[FILE-DELETE] File not found: ${id}`)
            return res.status(404).json({ error: 'File not found' })
          }

          console.log(`[FILE-DELETE] Found file: ${existingFile.file_name} at ${existingFile.storage_path}`)

          // Delete from storage first using the helper function
          if (existingFile.storage_path) {
            try {
              await deleteFileFromStorage(existingFile.storage_path)
              console.log(`[FILE-DELETE] Successfully deleted from storage: ${existingFile.storage_path}`)
            } catch (storageError) {
              console.error(`[FILE-DELETE] Storage deletion failed (continuing):`, storageError.message)
              // Continue with database deletion even if storage fails
            }
          }

          // Use the helper function which uses admin client for RLS bypass
          try {
            const deletedFile = await deleteFileUpload(id)
            console.log(`[FILE-DELETE] Successfully deleted from database: ${deletedFile.id}`)
          } catch (dbError) {
            console.error(`[FILE-DELETE] Database deletion failed:`, dbError.message)
            
            // Provide specific error messages based on the error type
            if (dbError.message.includes('new row violates row-level security policy')) {
              return res.status(500).json({ 
                error: 'Permission denied',
                details: 'Insufficient privileges to delete file. Admin access required.'
              })
            } else if (dbError.message.includes('violates foreign key constraint')) {
              return res.status(409).json({ 
                error: 'File in use',
                details: 'Cannot delete file as it is referenced by existing products.'
              })
            } else {
              throw dbError
            }
          }

          // Update any products that reference this file (both PDF and image references)
          const client = supabaseAdmin || supabase
          
          try {
            // Update PDF file references
            const { error: pdfUpdateError } = await client
              .from('products')
              .update({ pdf_file_id: null })
              .eq('pdf_file_id', id)
            
            if (pdfUpdateError) {
              console.warn(`[FILE-DELETE] Failed to clear PDF references:`, pdfUpdateError.message)
            }

            // Update image file references
            const { error: imageUpdateError } = await client
              .from('products')
              .update({ image_file_id: null })
              .eq('image_file_id', id)
            
            if (imageUpdateError) {
              console.warn(`[FILE-DELETE] Failed to clear image references:`, imageUpdateError.message)
            }

            console.log(`[FILE-DELETE] Cleared product references for file: ${id}`)
          } catch (updateError) {
            console.warn(`[FILE-DELETE] Non-critical error clearing product references:`, updateError.message)
            // Don't fail the deletion if we can't update product references
          }
          
          console.log(`[FILE-DELETE] File deletion completed successfully: ${id}`)
          res.status(200).json({ 
            message: 'File deleted successfully',
            file: existingFile 
          })
        } catch (error) {
          console.error(`[FILE-DELETE] Deletion failed for ${id}:`, {
            error: error.message,
            name: error.name,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          })
          
          // Return appropriate error based on the type
          if (error.message.includes('File not found') || error.message.includes('PGRST116')) {
            return res.status(404).json({ 
              error: 'File not found',
              details: 'The file may have already been deleted.'
            })
          } else if (error.message.includes('Permission denied') || error.message.includes('row-level security')) {
            return res.status(500).json({ 
              error: 'Server configuration error',
              details: 'File deletion requires admin privileges. Please contact support.'
            })
          } else {
            return res.status(500).json({ 
              error: 'Failed to delete file',
              details: process.env.NODE_ENV === 'development' 
                ? error.message 
                : 'An unexpected error occurred during file deletion'
            })
          }
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