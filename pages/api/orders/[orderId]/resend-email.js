import { getOrderById, createDownloadLinks, getProductFilesForAttachment } from '../../../../lib/supabase'
import { sendOrderConfirmationEmail } from '../../../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const { orderId } = req.query

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' })
  }

  try {
    console.log(`[RESEND-EMAIL] Starting email resend for order: ${orderId}`)

    // Get order details with items
    const orderWithItems = await getOrderById(orderId)

    if (!orderWithItems) {
      console.error(`[RESEND-EMAIL] Order ${orderId} not found`)
      return res.status(404).json({ error: 'Order not found' })
    }

    if (!orderWithItems.order_items || orderWithItems.order_items.length === 0) {
      console.error(`[RESEND-EMAIL] Order ${orderId} has no items`)
      return res.status(400).json({ error: 'Order has no items to send' })
    }

    console.log(`[RESEND-EMAIL] Found order with ${orderWithItems.order_items.length} items`)

    // Try to get files for email attachment first
    let attachmentFiles = []
    let downloadLinks = []

    try {
      console.log('[RESEND-EMAIL] Attempting to retrieve files for email attachment')
      attachmentFiles = await getProductFilesForAttachment(orderWithItems.order_items)
      console.log(`[RESEND-EMAIL] Retrieved ${attachmentFiles.length} files for attachment`)

      // Always create download links as backup
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, orderWithItems.email)
      console.log(`[RESEND-EMAIL] Created ${downloadLinks.length} backup download links`)

    } catch (fileError) {
      console.error('[RESEND-EMAIL] Error retrieving files for attachment:', fileError.message)
      console.log('[RESEND-EMAIL] Falling back to download links only')

      // Fallback to download links if file retrieval fails
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, orderWithItems.email)
    }

    // Send order confirmation email
    console.log('[RESEND-EMAIL] Preparing to send order confirmation email...')
    console.log('[RESEND-EMAIL] Email details:', {
      recipient: orderWithItems.email,
      orderId,
      attachmentCount: attachmentFiles.length,
      downloadLinkCount: downloadLinks.length
    })

    const emailResult = await sendOrderConfirmationEmail(
      orderWithItems,
      downloadLinks,
      attachmentFiles
    )

    if (emailResult.success) {
      console.log(`[RESEND-EMAIL] ✅ Order confirmation email sent successfully for order: ${orderId}`)
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        details: {
          recipient: orderWithItems.email,
          attachmentCount: attachmentFiles.length,
          downloadLinkCount: downloadLinks.length,
          deliveryMethod: attachmentFiles.length > 0 ? 'email_attachment' : 'download_links'
        }
      })
    } else {
      console.error(`[RESEND-EMAIL] ❌ Failed to send confirmation email for order ${orderId}:`)
      console.error('[RESEND-EMAIL] Email error details:', emailResult.error)
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        details: emailResult.error
      })
    }

  } catch (error) {
    console.error('[RESEND-EMAIL] ❌ CRITICAL ERROR in email resend:')
    console.error('[RESEND-EMAIL] Error message:', error.message)
    console.error('[RESEND-EMAIL] Error stack:', error.stack)
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}