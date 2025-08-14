/**
 * PayPal Integration Test Script
 * Tests PayPal API connectivity and order creation
 */

import { config } from 'dotenv'
import { createPayPalOrder, isPayPalAvailable } from '../lib/paypal.js'

// Load environment variables
config({ path: '.env.local' })

async function testPayPalIntegration() {
  console.log('🧪 Testing PayPal Integration...\n')

  // Test 1: Check PayPal Configuration
  console.log('1. Checking PayPal Configuration...')
  if (isPayPalAvailable()) {
    console.log('✅ PayPal is configured correctly')
    console.log(`   Environment: ${process.env.PAYPAL_ENVIRONMENT || 'sandbox'}`)
    console.log(`   Client ID: ${process.env.PAYPAL_CLIENT_ID ? process.env.PAYPAL_CLIENT_ID.substring(0, 10) + '...' : 'Not set'}`)
  } else {
    console.log('❌ PayPal is not configured')
    console.log('   Missing environment variables:')
    if (!process.env.PAYPAL_CLIENT_ID) console.log('   - PAYPAL_CLIENT_ID')
    if (!process.env.PAYPAL_CLIENT_SECRET) console.log('   - PAYPAL_CLIENT_SECRET')
    return
  }

  // Test 2: Create Test Order
  console.log('\n2. Testing PayPal Order Creation...')
  
  const testOrderData = {
    items: [
      {
        id: 'test-product-1',
        title: 'Test Digital Art Print',
        description: 'A beautiful test digital artwork',
        price: 9.99,
        quantity: 1
      },
      {
        id: 'test-product-2', 
        title: 'Another Test Print',
        description: 'Another test digital artwork',
        price: 14.99,
        quantity: 2
      }
    ],
    email: 'test@mjkprints.com',
    orderId: 'test-order-' + Date.now(),
    successUrl: 'http://localhost:3000/success',
    cancelUrl: 'http://localhost:3000/cart'
  }

  try {
    const paypalOrder = await createPayPalOrder(testOrderData)
    console.log('✅ PayPal order created successfully')
    console.log(`   Order ID: ${paypalOrder.id}`)
    console.log(`   Status: ${paypalOrder.status}`)
    console.log(`   Total: $${testOrderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}`)
    
    // Find approval URL
    const approvalUrl = paypalOrder.links?.find(link => link.rel === 'approve')?.href
    if (approvalUrl) {
      console.log(`   Approval URL: ${approvalUrl}`)
      console.log('\n🎉 PayPal integration test completed successfully!')
      console.log('   You can use the approval URL above to test the complete payment flow.')
    } else {
      console.log('⚠️  Approval URL not found in PayPal response')
    }

  } catch (error) {
    console.log('❌ PayPal order creation failed')
    console.error(`   Error: ${error.message}`)
    
    if (error.message.includes('access token')) {
      console.log('\n🔧 Troubleshooting Tips:')
      console.log('   - Verify PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are correct')
      console.log('   - Check if credentials are for the correct environment (sandbox/live)')
      console.log('   - Ensure PayPal app has proper permissions')
    }
  }

  console.log('\n📋 Test Summary:')
  console.log(`   PayPal Configuration: ${isPayPalAvailable() ? 'PASS' : 'FAIL'}`)
  console.log('   Order Creation: Check output above')
  console.log('\n💡 Next Steps:')
  console.log('   1. Set up PayPal webhook endpoint in PayPal Developer Console')
  console.log('   2. Test webhook processing with: npm run paypal:webhook:test')
  console.log('   3. Test complete checkout flow in browser')
}

// Run the test
testPayPalIntegration().catch(console.error)