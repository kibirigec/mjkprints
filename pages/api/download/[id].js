import { getOrderItemById, updateDownloadCount, supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end('Method Not Allowed')
  }

  const { id } = req.query
  const { email } = req.query

  if (!id) {
    return res.status(400).json({ error: 'Download ID is required' })
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required' })
  }

  try {
    // Get the download record
    const { data: download, error: downloadError } = await supabase
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
      .eq('order_item_id', id)
      .eq('customer_email', email)
      .single()

    if (downloadError || !download) {
      console.error('Download not found:', downloadError)
      return res.status(404).json({ error: 'Download not found or access denied' })
    }

    // Check if download has expired
    const now = new Date()
    const expiryDate = new Date(download.expires_at)
    if (now > expiryDate) {
      return res.status(410).json({ error: 'Download link has expired' })
    }

    // Check download count limit (5 downloads max)
    const currentDownloadCount = download.download_count || 0
    if (currentDownloadCount >= 5) {
      return res.status(429).json({ error: 'Download limit exceeded (5 downloads maximum)' })
    }

    // Get the file to download (prefer PDF over image)
    const product = download.order_items.products
    let fileToDownload = null
    
    if (product.pdf_file && product.pdf_file.storage_path) {
      fileToDownload = product.pdf_file
    } else if (product.image_file && product.image_file.storage_path) {
      fileToDownload = product.image_file
    }

    if (!fileToDownload) {
      console.error('No downloadable file found for product:', product.title)
      return res.status(404).json({ error: 'File not found' })
    }

    // Get the file from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('mjk-prints-storage')
      .download(fileToDownload.storage_path)

    if (fileError || !fileData) {
      console.error('File download error:', fileError)
      return res.status(404).json({ error: 'File could not be retrieved' })
    }

    // Update download count
    await supabase
      .from('downloads')
      .update({ 
        download_count: currentDownloadCount + 1,
        last_downloaded_at: new Date().toISOString()
      })
      .eq('order_item_id', id)
      .eq('customer_email', email)

    // Set appropriate headers for file download
    const fileName = fileToDownload.file_name || `${product.title}.${fileToDownload.file_type?.split('/')[1] || 'pdf'}`
    const contentType = fileToDownload.file_type || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', fileToDownload.file_size || fileData.size)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    // Convert blob to buffer and send
    const buffer = await fileData.arrayBuffer()
    res.send(Buffer.from(buffer))

    console.log(`File downloaded: ${fileName} by ${email} (${currentDownloadCount + 1}/5)`)

  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ 
      error: 'Failed to process download',
      details: error.message 
    })
  }
}