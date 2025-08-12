import { createCheckoutSession } from '../../../lib/stripe'
import { createOrder, createOrderItems } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { items, email, billingDetails } = req.body
    
    console.log('[CHECKOUT] Starting checkout session creation:', {
      itemsCount: items?.length,
      email: email,
      hasBillingDetails: !!billingDetails
    })

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('[CHECKOUT] Validation failed: Invalid items array')
      return res.status(400).json({ 
        error: 'Invalid checkout: items array is required and cannot be empty' 
      })
    }

    if (!email || !email.includes('@')) {
      console.log('[CHECKOUT] Validation failed: Invalid email')
      return res.status(400).json({ 
        error: 'Valid email address is required' 
      })
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    console.log('[CHECKOUT] Total calculated:', total)

    // Create pending order in database
    console.log('[CHECKOUT] Creating order in database...')
    try {
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
      console.log('[CHECKOUT] Order created successfully:', order.id)

      // Create order items
      const orderItemsData = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price
      }))
      console.log('[CHECKOUT] Creating order items:', orderItemsData.length, 'items')

      await createOrderItems(order.id, orderItemsData)
      console.log('[CHECKOUT] Order items created successfully')

      // Create Stripe checkout session
      console.log('[CHECKOUT] Creating Stripe checkout session...')
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      
      const session = await createCheckoutSession({
        items,
        email,
        orderId: order.id,
        successUrl: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancelUrl: `${baseUrl}/cart?canceled=true`
      })
      console.log('[CHECKOUT] Stripe session created successfully:', session.id)

      // Update order with Stripe session ID
      // Note: You might want to add this function to your supabase.js file
      // await updateOrderStripeSession(order.id, session.id)

      console.log('[CHECKOUT] Checkout session completed successfully')
      res.status(200).json({
        sessionId: session.id,
        sessionUrl: session.url,
        orderId: order.id
      })

    } catch (dbError) {
      console.error('[CHECKOUT] Database operation failed:', {
        error: dbError.message,
        stack: dbError.stack,
        orderData: {
          email,
          total_amount: total,
          status: 'pending'
        },
        itemsData: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      })
      
      // More specific error details
      if (dbError.message.includes('violates row-level security policy')) {
        console.error('[CHECKOUT] RLS Policy Error - this should not happen with admin client')
      }
      if (dbError.message.includes('violates foreign key constraint')) {
        console.error('[CHECKOUT] Foreign Key Error - invalid product_id likely')
      }
      if (dbError.message.includes('violates check constraint')) {
        console.error('[CHECKOUT] Check Constraint Error - invalid data values')
      }
      
      throw new Error(`Database operation failed: ${dbError.message}`)
    }

  } catch (error) {
    console.error('[CHECKOUT] Session creation error:', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    })
  }
}