import { buffer } from 'micro'
import { verifyPayPalWebhookSignature } from '../../../lib/paypal'
import { updateOrderStatus, createDownloadLinks, getOrderById, getProductFilesForAttachment, getOrderByPayPalId } from '../../../lib/supabase'
import { sendOrderConfirmationEmail } from '../../../lib/email'

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  const buf = await buffer(req)
  const payload = buf.toString()

  // PayPal webhook headers
  const headers = {
    'paypal-auth-algo': req.headers['paypal-auth-algo'],
    'paypal-cert-id': req.headers['paypal-cert-id'],
    'paypal-transmission-id': req.headers['paypal-transmission-id'],
    'paypal-transmission-sig': req.headers['paypal-transmission-sig'],
    'paypal-transmission-time': req.headers['paypal-transmission-time']
  }

  console.log('Received PayPal webhook:', {
    headers,
    payloadLength: payload.length
  })

  try {
    // Verify webhook signature
    const isValidSignature = await verifyPayPalWebhookSignature(payload, headers)
    
    if (!isValidSignature) {
      console.error('Invalid PayPal webhook signature')
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    const event = JSON.parse(payload)
    console.log('PayPal webhook event type:', event.event_type)

    // Handle different event types
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event)
        break
      
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event)
        break
      
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(event)
        break

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`)
    }

    res.status(200).json({ received: true })

  } catch (error) {
    console.error('PayPal webhook processing error:', error)
    res.status(400).json({ error: 'Webhook processing failed' })
  }
}

async function handleOrderApproved(event) {
  try {
    console.log('[PAYPAL WEBHOOK] Processing order approval')
    
    const order = event.resource
    const orderId = order.purchase_units?.[0]?.reference_id
    const payerEmail = order.payer?.email_address

    if (!orderId) {
      console.error('[PAYPAL WEBHOOK] No reference_id found in order')
      return
    }

    console.log(`[PAYPAL WEBHOOK] Order approved: ${orderId}, Email: ${payerEmail}`)

    // Update order status to approved (waiting for capture)
    await updateOrderStatus(
      orderId, 
      'approved', 
      order.id
    )

    console.log('[PAYPAL WEBHOOK] Order status updated to approved')

  } catch (error) {
    console.error('[PAYPAL WEBHOOK] Error processing order approval:', error)
  }
}

async function handlePaymentCaptureCompleted(event) {
  try {
    console.log('[PAYPAL WEBHOOK] Starting payment capture completion processing')
    
    const capture = event.resource
    const orderId = capture.supplementary_data?.related_ids?.order_id
    
    // Try to find order ID from custom_id first
    let dbOrderId = capture.custom_id
    
    if (!dbOrderId && orderId) {
      // If we have the PayPal order ID, look it up in our database
      console.log('[PAYPAL WEBHOOK] Attempting to find order by PayPal order ID:', orderId)
      try {
        const orderRecord = await getOrderByPayPalId(orderId)
        if (orderRecord) {
          dbOrderId = orderRecord.id
          console.log('[PAYPAL WEBHOOK] Found order by PayPal ID lookup:', dbOrderId)
        }
      } catch (lookupError) {
        console.error('[PAYPAL WEBHOOK] Error looking up order by PayPal ID:', lookupError.message)
      }
    }

    if (!dbOrderId) {
      console.error('[PAYPAL WEBHOOK] CRITICAL: No order ID found in capture data')
      console.error('[PAYPAL WEBHOOK] Capture data:', JSON.stringify(capture, null, 2))
      console.error('[PAYPAL WEBHOOK] Tried custom_id and PayPal order ID lookup')
      return
    }

    const payerEmail = capture.payer?.email_address
    console.log(`[PAYPAL WEBHOOK] Processing completed payment for order: ${dbOrderId}`)
    console.log(`[PAYPAL WEBHOOK] Payer email: ${payerEmail}`)

    // Update order status to completed
    console.log('[PAYPAL WEBHOOK] Updating order status to completed...')
    const updatedOrder = await updateOrderStatus(
      dbOrderId, 
      'completed', 
      capture.id
    )
    console.log('[PAYPAL WEBHOOK] Order status updated successfully')

    // Get order details with items
    console.log('[PAYPAL WEBHOOK] Fetching order details with items...')
    const orderWithItems = await getOrderById(dbOrderId)

    if (!orderWithItems) {
      console.error(`[PAYPAL WEBHOOK] CRITICAL: Order ${dbOrderId} not found after update`)
      return
    }

    if (!orderWithItems.order_items || orderWithItems.order_items.length === 0) {
      console.error(`[PAYPAL WEBHOOK] CRITICAL: Order ${dbOrderId} has no items`)
      console.error('[PAYPAL WEBHOOK] Order data:', orderWithItems)
      return
    }

    console.log(`[PAYPAL WEBHOOK] Processing order items for attachment delivery: ${dbOrderId}`)
    console.log(`[PAYPAL WEBHOOK] Found ${orderWithItems.order_items.length} order items`)
    
    // Try to get files for email attachment first
    let attachmentFiles = []
    let downloadLinks = []
    const email = payerEmail || orderWithItems.email
    
    try {
      console.log('[PAYPAL WEBHOOK] Attempting to retrieve files for email attachment')
      attachmentFiles = await getProductFilesForAttachment(orderWithItems.order_items)
      console.log(`[PAYPAL WEBHOOK] Retrieved ${attachmentFiles.length} files for attachment`)
      
      // Always create download links as backup
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, email)
      console.log(`[PAYPAL WEBHOOK] Created ${downloadLinks.length} backup download links`)
      
    } catch (fileError) {
      console.error('[PAYPAL WEBHOOK] Error retrieving files for attachment:', fileError.message)
      console.log('[PAYPAL WEBHOOK] Falling back to download links only')
      
      // Fallback to download links if file retrieval fails
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, email)
    }

    // Send order confirmation email with attachments and/or download links
    console.log('[PAYPAL WEBHOOK] Preparing to send order confirmation email...')
    console.log('[PAYPAL WEBHOOK] Email details:', {
      recipient: email,
      orderId: dbOrderId,
      attachmentCount: attachmentFiles.length,
      downloadLinkCount: downloadLinks.length
    })
    
    const emailResult = await sendOrderConfirmationEmail(
      orderWithItems, 
      downloadLinks,
      attachmentFiles
    )
    
    if (emailResult.success) {
      console.log(`[PAYPAL WEBHOOK] ✅ Order confirmation email sent successfully for order: ${dbOrderId}`, {
        recipient: email,
        attachmentCount: attachmentFiles.length,
        downloadLinkCount: downloadLinks.length,
        deliveryMethod: attachmentFiles.length > 0 ? 'email_attachment' : 'download_links'
      })
    } else {
      console.error(`[PAYPAL WEBHOOK] ❌ Failed to send confirmation email for order ${dbOrderId}:`)
      console.error('[PAYPAL WEBHOOK] Email error details:', emailResult.error)
      console.error('[PAYPAL WEBHOOK] Email result:', emailResult)
    }

  } catch (error) {
    console.error('[PAYPAL WEBHOOK] ❌ CRITICAL ERROR in payment capture completion:')
    console.error('[PAYPAL WEBHOOK] Error message:', error.message)
    console.error('[PAYPAL WEBHOOK] Error stack:', error.stack)
    console.error('[PAYPAL WEBHOOK] Event data:', JSON.stringify(event, null, 2))
  }
  
  return
}

async function handlePaymentCaptureDenied(event) {
  try {
    console.log('[PAYPAL WEBHOOK] Processing payment capture denial')
    
    const capture = event.resource
    const dbOrderId = capture.custom_id
    
    if (!dbOrderId) {
      console.error('[PAYPAL WEBHOOK] No order ID found in capture denial')
      return
    }

    console.log(`[PAYPAL WEBHOOK] Payment denied for order: ${dbOrderId}`)

    // Update order status to failed
    await updateOrderStatus(
      dbOrderId, 
      'failed', 
      capture.id
    )

    console.log('[PAYPAL WEBHOOK] Order status updated to failed')

  } catch (error) {
    console.error('[PAYPAL WEBHOOK] Error processing payment capture denial:', error)
  }
  
  return
}