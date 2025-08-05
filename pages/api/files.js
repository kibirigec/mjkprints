import { 
  getFileUploadsByProduct,
  getFileUploadById,
  updateFileProcessingStatus,
  deleteFileUpload,
  supabase
} from '../../lib/supabase'

export default async function handler(req, res) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        // Get all file uploads with product information
        const { data: files, error } = await supabase
          .from('file_uploads')
          .select(`
            *,
            products!file_uploads_product_id_fkey (
              id,
              title,
              description,
              created_at
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch files: ${error.message}`)
        }

        res.status(200).json(files || [])
        break

      case 'DELETE':
        try {
          const { id } = req.query
          
          if (!id) {
            return res.status(400).json({ error: 'File ID is required' })
          }

          // Get file information first
          const fileData = await getFileUploadById(id)
          if (!fileData) {
            return res.status(404).json({ error: 'File not found' })
          }

          // Delete from storage
          if (fileData.storage_path) {
            const { error: storageError } = await supabase.storage
              .from('mjk-prints-storage')
              .remove([fileData.storage_path])
            
            if (storageError) {
              console.error('Storage deletion error:', storageError)
              // Continue with database deletion even if storage fails
            }
          }

          // Delete from database
          const deletedFile = await deleteFileUpload(id)
          
          res.status(200).json({
            message: 'File deleted successfully',
            file: deletedFile
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
        res.setHeader('Allow', ['GET', 'DELETE'])
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