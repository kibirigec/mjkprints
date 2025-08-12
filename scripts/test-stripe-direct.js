#!/usr/bin/env node

// Direct test of the Stripe integration
import { config } from 'dotenv'

// Load environment variables first
config({ path: '.env.local' })

// Import Stripe functions after env is loaded
const { createCheckoutSession, isStripeAvailable } = await import('../lib/stripe.js')

async function testStripeDirect() {
  console.log('🧪 Direct Stripe integration test...\n')
  
  console.log('🔍 Stripe Configuration Check:')
  console.log('- STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY)
  console.log('- Key starts with sk_:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_'))
  console.log('- Stripe available:', isStripeAvailable())
  console.log('')
  
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
    console.log('📝 Testing Stripe checkout session creation...')
    console.log('Order data:', {
      itemsCount: testOrderData.items.length,
      email: testOrderData.email,
      orderId: testOrderData.orderId,
      totalValue: testOrderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    })
    console.log('')
    
    const session = await createCheckoutSession(testOrderData)
    
    console.log('✅ Stripe session created successfully!')
    console.log('Session details:', {
      id: session.id,
      url: session.url,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency,
      expires_at: new Date(session.expires_at * 1000).toISOString()
    })
    
    console.log('\n🎉 Stripe integration is working correctly!')
    console.log('The 500 error must be coming from somewhere else.')
    
  } catch (error) {
    console.error('❌ Stripe session creation failed:')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Additional error analysis
    if (error.message.includes('No such customer')) {
      console.log('\n🔍 ANALYSIS: Customer issue')
      console.log('- Stripe customer ID might be invalid')
    }
    
    if (error.message.includes('Invalid request')) {
      console.log('\n🔍 ANALYSIS: Invalid request to Stripe API')
      console.log('- Check the request parameters and format')
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n🔍 ANALYSIS: Authentication issue')
      console.log('- Stripe secret key might be incorrect or expired')
    }
    
    if (error.message.includes('rate limit')) {
      console.log('\n🔍 ANALYSIS: Rate limit issue')
      console.log('- Too many requests to Stripe API')
    }
  }
}

testStripeDirect()