import { 
  getFileUploadById,
  updateFileProcessingStatus,
  supabase
} from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  const { method, query } = req
  const { id } = query

  if (!id) {
    return res.status(400).json({ error: 'File ID is required' })
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
          // Check if file exists first
          const existingFile = await getFileUploadById(id)
          if (!existingFile) {
            return res.status(404).json({ error: 'File not found' })
          }

          // Delete from storage first
          if (existingFile.storage_path) {
            const { error: storageError } = await supabase.storage
              .from('mjk-prints-storage')
              .remove([existingFile.storage_path])
            
            if (storageError) {
              console.error('Storage deletion error:', storageError)
              // Continue with database deletion even if storage fails
            }
          }

          // Delete from database
          const { error: dbError } = await supabase
            .from('file_uploads')
            .delete()
            .eq('id', id)

          if (dbError) {
            throw new Error(`Failed to delete file: ${dbError.message}`)
          }

          // Update any products that reference this file
          await supabase
            .from('products')
            .update({ pdf_file_id: null })
            .eq('pdf_file_id', id)
          
          res.status(200).json({ 
            message: 'File deleted successfully',
            file: existingFile 
          })
        } catch (error) {
          console.error('Delete file error:', error)
          res.status(500).json({ 
            error: 'Failed to delete file',
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