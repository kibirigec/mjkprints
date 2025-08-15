// Debug endpoint to test PayPal order creation
import { createPayPalOrder } from '../../../lib/paypal'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end('Method Not Allowed')
  }

  // Only allow with debug key
  const debugKey = req.query.debug
  if (debugKey !== 'mjk-debug-2025') {
    return res.status(403).json({ error: 'Debug access denied' })
  }

  try {
    const testOrderData = {
      items: [
        {
          id: "3ee6d148-8a2d-409a-bd1a-a5e892df4907",
          title: "Test Product",
          price: 10.00,
          quantity: 1,
          description: "Test digital download"
        }
      ],
      email: "test@example.com",
      orderId: "test-order-123",
      successUrl: "https://mjkprints.store/success?paypal_order_id={order_id}&order_id=test-order-123",
      cancelUrl: "https://mjkprints.store/cart?canceled=true"
    }

    console.log('[DEBUG] Testing PayPal order creation with:', testOrderData)
    
    const paypalOrder = await createPayPalOrder(testOrderData)
    
    console.log('[DEBUG] PayPal order created successfully:', paypalOrder.id)
    
    const approvalUrl = paypalOrder.links?.find(link => link.rel === 'approve')?.href
    
    res.status(200).json({
      success: true,
      paypalOrderId: paypalOrder.id,
      approvalUrl,
      fullResponse: paypalOrder
    })

  } catch (error) {
    console.error('[DEBUG] PayPal test failed:', error.message)
    res.status(500).json({ 
      error: 'PayPal test failed',
      details: error.message,
      stack: error.stack
    })
  }
}