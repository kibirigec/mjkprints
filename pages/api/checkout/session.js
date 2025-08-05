import { createCheckoutSession } from '../../../lib/stripe'
import { createOrder, createOrderItems } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { items, email, billingDetails } = req.body

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid checkout: items array is required and cannot be empty' 
      })
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        error: 'Valid email address is required' 
      })
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Create pending order in database
    const order = await createOrder({
      email,
      total_amount: total,
      status: 'pending', // Will be updated after successful payment
      billing_details: billingDetails,
      metadata: {
        source: 'stripe_checkout',
        userAgent: req.headers['user-agent']
      }
    })

    // Create order items
    const orderItemsData = items.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price
    }))

    await createOrderItems(order.id, orderItemsData)

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    
    const session = await createCheckoutSession({
      items,
      email,
      orderId: order.id,
      successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancelUrl: `${baseUrl}/cart?canceled=true`
    })

    // Update order with Stripe session ID
    // Note: You might want to add this function to your supabase.js file
    // await updateOrderStripeSession(order.id, session.id)

    res.status(200).json({
      sessionId: session.id,
      sessionUrl: session.url,
      orderId: order.id
    })

  } catch (error) {
    console.error('Checkout session creation error:', error)
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    })
  }
}