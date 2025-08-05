// Debug endpoint to reset file processing status
import { updateFileProcessingStatus, getFileUploadById } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileId } = req.body

  if (!fileId) {
    return res.status(400).json({ 
      error: 'Missing file ID',
      details: 'fileId is required'
    })
  }

  try {
    console.log(`[RESET] Resetting processing status for file: ${fileId}`)
    
    // First, get the current file record
    const file = await getFileUploadById(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }
    
    console.log(`[RESET] Current status: ${file.processing_status}`)
    
    // Reset to pending status with empty metadata
    await updateFileProcessingStatus(fileId, 'pending', {
      resetAt: new Date().toISOString(),
      resetReason: 'Debug reset for reprocessing'
    })
    
    console.log(`[RESET] Status reset to pending for file: ${fileId}`)
    
    return res.status(200).json({
      success: true,
      message: 'Processing status reset to pending',
      fileId: fileId,
      previousStatus: file.processing_status
    })
    
  } catch (error) {
    console.error('[RESET] Failed to reset processing status:', error.message)
    
    return res.status(500).json({
      error: 'Reset failed',
      details: error.message
    })
  }
}