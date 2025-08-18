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
    }

    res.status(200).json({ received: true })

  } catch (error) {
    console.error('PayPal webhook processing error:', error)
    res.status(400).json({ error: 'Webhook processing failed' })
  }
}

async function handleOrderApproved(event) {
  try {
    
    const order = event.resource
    const orderId = order.purchase_units?.[0]?.reference_id
    const payerEmail = order.payer?.email_address

    if (!orderId) {
      console.error('[PAYPAL WEBHOOK] No reference_id found in order')
      return
    }


    // Update order status to approved (waiting for capture)
    await updateOrderStatus(
      orderId, 
      'approved', 
      order.id
    )


  } catch (error) {
    console.error('[PAYPAL WEBHOOK] Error processing order approval:', error)
  }
}

async function handlePaymentCaptureCompleted(event) {
  try {
    
    const capture = event.resource
    const orderId = capture.supplementary_data?.related_ids?.order_id
    
    // Try to find order ID from custom_id first
    let dbOrderId = capture.custom_id
    
    if (!dbOrderId && orderId) {
      // If we have the PayPal order ID, look it up in our database
      try {
        const orderRecord = await getOrderByPayPalId(orderId)
        if (orderRecord) {
          dbOrderId = orderRecord.id
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

    // Update order status to completed
    const updatedOrder = await updateOrderStatus(
      dbOrderId, 
      'completed', 
      capture.id
    )

    // Get order details with items
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

    
    // Try to get files for email attachment first
    let attachmentFiles = []
    let downloadLinks = []
    const email = payerEmail || orderWithItems.email
    
    try {
      attachmentFiles = await getProductFilesForAttachment(orderWithItems.order_items)
      
      // Always create download links as backup
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, email)
      
    } catch (fileError) {
      console.error('[PAYPAL WEBHOOK] Error retrieving files for attachment:', fileError.message)
      
      // Fallback to download links if file retrieval fails
      downloadLinks = await createDownloadLinks(orderWithItems.order_items, email)
    }

    // Send order confirmation email with attachments and/or download links
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
    
    const capture = event.resource
    const dbOrderId = capture.custom_id
    
    if (!dbOrderId) {
      console.error('[PAYPAL WEBHOOK] No order ID found in capture denial')
      return
    }


    // Update order status to failed
    await updateOrderStatus(
      dbOrderId, 
      'failed', 
      capture.id
    )


  } catch (error) {
    console.error('[PAYPAL WEBHOOK] Error processing payment capture denial:', error)
  }
  
  return
}