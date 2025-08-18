#!/usr/bin/env node

// Direct test of the Stripe integration
import { config } from 'dotenv'

// Load environment variables first
config({ path: '.env.local' })

// Import Stripe functions after env is loaded
const { createCheckoutSession, isStripeAvailable } = await import('../lib/stripe.js')

async function testStripeDirect() {
  
  
  if (!isStripeAvailable()) {
    console.error('❌ Stripe is not available - cannot proceed')
    return
  }
  
  const testOrderData = {
    items: [
      {
        id: "d79f8300-ea32-4533-b9b8-3665e2e1706b",
        title: "Big Tree Flyer",
        description: "Beautiful abstract mountain landscape in soft watercolor tones.",
        price: 19.41,
        quantity: 1,
        image: "https://hminnrncnrquogdwnpan.supabase.co/storage/v1/object/public/mjk-prints-storage/previews/b887d616-2948-450e-8201-d3c7e03126a8/page-1-medium.jpg"
      }
    ],
    email: 'test@mjkprints.com',
    orderId: 'test-order-' + Date.now(),
    successUrl: 'http://localhost:3001/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'http://localhost:3001/cart?canceled=true'
  }
  
  try {
      itemsCount: testOrderData.items.length,
      email: testOrderData.email,
      orderId: testOrderData.orderId,
      totalValue: testOrderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })
    
    const session = await createCheckoutSession(testOrderData)
    
      id: session.id,
      url: session.url,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      expires_at: new Date(session.expires_at * 1000).toISOString()
    })
    
    
  } catch (error) {
    console.error('❌ Stripe session creation failed:')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Additional error analysis
    if (error.message.includes('No such customer')) {
    }
    
    if (error.message.includes('Invalid request')) {
    }
    
    if (error.message.includes('authentication')) {
    }
    
    if (error.message.includes('rate limit')) {
    }
  }
}

testStripeDirect()