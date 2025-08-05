import { buffer } from 'micro'
import { verifyWebhookSignature } from '../../../lib/stripe'
import { updateOrderStatus, createDownloadLinks, getOrderById } from '../../../lib/supabase'
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
  const signature = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!endpointSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET environment variable')
    return res.status(500).json({ error: 'Webhook secret not configured' })
  }

  try {
    // Verify webhook signature
    const event = verifyWebhookSignature(buf, signature, endpointSecret)

    console.log('Received Stripe webhook:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    res.status(400).json({ error: 'Webhook processing failed' })
  }
}

async function handleCheckoutSessionCompleted(session) {
  try {
    const orderId = session.metadata?.order_id
    const email = session.metadata?.email || session.customer_email

    if (!orderId) {
      console.error('No order_id found in session metadata')
      return
    }

    console.log(`Processing completed checkout for order: ${orderId}`)

    // Update order status to completed
    const updatedOrder = await updateOrderStatus(
      orderId, 
      'completed', 
      session.payment_intent
    )

    // Get order details with items
    const orderWithItems = await getOrderById(orderId)

    if (orderWithItems && orderWithItems.order_items) {
      // Create download links
      const downloadLinks = await createDownloadLinks(orderWithItems.order_items, email)
      console.log(`Created download links for order: ${orderId}`)

      // Send order confirmation email with download links
      const emailResult = await sendOrderConfirmationEmail(orderWithItems, downloadLinks)
      
      if (emailResult.success) {
        console.log(`Order confirmation email sent for order: ${orderId}`)
      } else {
        console.error(`Failed to send confirmation email for order ${orderId}:`, emailResult.error)
      }
    }

  } catch (error) {
    console.error('Error processing checkout session completion:', error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log(`Payment succeeded: ${paymentIntent.id}`)
    
    // Additional processing can be added here if needed
    // For example, updating analytics, sending confirmation emails, etc.

  } catch (error) {
    console.error('Error processing payment intent success:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log(`Payment failed: ${paymentIntent.id}`)
    
    // Find order by payment intent and mark as failed
    // You might need to add a function to search orders by payment intent ID
    
  } catch (error) {
    console.error('Error processing payment intent failure:', error)
  }
}