import { createPayPalOrder } from '../../../lib/paypal'
import { createOrder, createOrderItems, updateOrderWithPayPalId } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  // Validate PayPal environment variables early
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET
  
  console.log('[CHECKOUT] Environment check:', {
    hasClientId: !!paypalClientId,
    hasClientSecret: !!paypalClientSecret,
    clientIdLength: paypalClientId?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    platform: process.platform
  })
  
  if (!paypalClientId || !paypalClientSecret) {
    console.error('[CHECKOUT] Missing PayPal credentials:', {
      PAYPAL_CLIENT_ID: paypalClientId ? 'SET' : 'MISSING',
      PAYPAL_CLIENT_SECRET: paypalClientSecret ? 'SET' : 'MISSING'
    })
    return res.status(500).json({
      error: 'PayPal configuration error',
      details: 'PayPal credentials not properly configured on server'
    })
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

    // Add validation for the total amount
    if (isNaN(total) || total <= 0) {
      console.error('[CHECKOUT] Validation failed: Invalid total amount.', {
        total,
        items
      })
      return res.status(400).json({
        error: 'Invalid checkout: Total amount must be a positive number.',
        details: 'This may be caused by products with a missing or invalid price.'
      })
    }

    // Create pending order in database
    console.log('[CHECKOUT] Creating order in database...')
    try {
      const order = await createOrder({
        email,
        total_amount: total,
        status: 'pending', // Will be updated after successful payment
        billing_details: billingDetails,
        metadata: {
          source: 'paypal_checkout',
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

      // Create PayPal order
      console.log('[CHECKOUT] Creating PayPal order...')
      
      // Enhanced URL resolution with production failsafes
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'
      
      // Production environment detection and failsafe
      const isProduction = process.env.NODE_ENV === 'production'
      const isNetlify = !!process.env.NETLIFY
      const isVercel = !!process.env.VERCEL
      
      // If we're in production but still using localhost, try to detect the correct URL
      if (isProduction && baseUrl.includes('localhost')) {
        console.warn('[CHECKOUT] ⚠️ CRITICAL: Production environment detected but using localhost URL!')
        
        // Try to get the correct production URL from platform-specific variables
        let productionUrl = null
        
        if (isNetlify) {
          // For Netlify, try to get the deploy URL
          productionUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL
          console.log('[CHECKOUT] Attempting Netlify URL fallback:', productionUrl)
        } else if (isVercel) {
          // For Vercel, construct from VERCEL_URL
          productionUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
          console.log('[CHECKOUT] Attempting Vercel URL fallback:', productionUrl)
        }
        
        // Use production URL if found, otherwise force a reasonable default
        if (productionUrl && !productionUrl.includes('localhost')) {
          baseUrl = productionUrl
          console.log('[CHECKOUT] ✅ Using platform URL fallback:', baseUrl)
        } else {
          // Last resort: use a reasonable production URL
          baseUrl = 'https://mjkprints.store'
          console.error('[CHECKOUT] 🚨 USING HARDCODED FALLBACK URL:', baseUrl)
        }
      }
      
      // Debug logging for URL resolution
      console.log('[CHECKOUT] Environment URL resolution:', {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        resolvedBaseUrl: baseUrl,
        isProduction,
        isNetlify,
        isVercel,
        nodeEnv: process.env.NODE_ENV,
        deployUrl: process.env.DEPLOY_URL,
        vercelUrl: process.env.VERCEL_URL
      })
      
      const paypalOrder = await createPayPalOrder({
        items,
        email,
        orderId: order.id,
        successUrl: `${baseUrl}/success?order_id=${order.id}`,
        cancelUrl: `${baseUrl}/cart?canceled=true`
      })
      
      // Find approval URL from PayPal links
      const approvalUrl = paypalOrder.links?.find(link => link.rel === 'approve')?.href
      
      if (!approvalUrl) {
        throw new Error('PayPal approval URL not found')
      }
      
      // Debug logging for generated URLs
      console.log('[CHECKOUT] Generated PayPal URLs:', {
        successUrl: `${baseUrl}/success?paypal_order_id={order_id}&order_id=${order.id}`,
        cancelUrl: `${baseUrl}/cart?canceled=true`,
        paypalOrderId: paypalOrder.id,
        approvalUrl
      })
      console.log('[CHECKOUT] PayPal order created successfully:', paypalOrder.id)

      // Update order with PayPal order ID
      console.log('[CHECKOUT] Updating database order with PayPal order ID...')
      await updateOrderWithPayPalId(order.id, paypalOrder.id)

      console.log('[CHECKOUT] Checkout session completed successfully')
      res.status(200).json({
        paypalOrderId: paypalOrder.id,
        approvalUrl: approvalUrl,
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