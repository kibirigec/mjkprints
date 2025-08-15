#!/usr/bin/env node

/**
 * PayPal Integration Test Script
 * Tests the complete PayPal payment flow including order creation and webhook processing
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../.env.local') })

import { createPayPalOrder, isPayPalAvailable } from '../lib/paypal.js'
import { createOrder, createOrderItems, updateOrderWithPayPalId, getOrderByPayPalId } from '../lib/supabase.js'

const testPayPalIntegration = async () => {
  console.log('🧪 Starting PayPal Integration Test...\n')

  try {
    // 1. Test PayPal configuration
    console.log('1. Testing PayPal Configuration...')
    if (!isPayPalAvailable()) {
      throw new Error('PayPal is not configured properly')
    }
    console.log('✅ PayPal configuration is valid\n')

    // 2. Test environment variables
    console.log('2. Testing Environment Variables...')
    const requiredVars = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`)
      }
    }
    console.log('✅ All required environment variables are set\n')

    // 3. Test database order creation
    console.log('3. Testing Database Order Creation...')
    const testOrder = await createOrder({
      email: 'test@mjkprints.store',
      total_amount: 19.99,
      status: 'pending',
      billing_details: { email: 'test@mjkprints.store', name: 'Test Customer' },
      metadata: { source: 'paypal_test', test: true }
    })
    console.log(`✅ Database order created with ID: ${testOrder.id}\n`)

    // 4. Test order items creation
    console.log('4. Testing Order Items Creation...')
    await createOrderItems(testOrder.id, [
      {
        product_id: '3ee6d148-8a2d-409a-bd1a-a5e892df4907', // Use existing product ID
        quantity: 1,
        unit_price: 19.99
      }
    ])
    console.log('✅ Order items created successfully\n')

    // 5. Test PayPal order creation
    console.log('5. Testing PayPal Order Creation...')
    const paypalOrder = await createPayPalOrder({
      items: [
        {
          id: '3ee6d148-8a2d-409a-bd1a-a5e892df4907',
          title: 'Test Digital Print',
          price: 19.99,
          quantity: 1,
          description: 'Test product for PayPal integration'
        }
      ],
      email: 'test@mjkprints.store',
      orderId: testOrder.id,
      successUrl: 'https://mjkprints.store/success',
      cancelUrl: 'https://mjkprints.store/cart?canceled=true'
    })
    console.log(`✅ PayPal order created with ID: ${paypalOrder.id}\n`)

    // 6. Test updating order with PayPal ID
    console.log('6. Testing PayPal Order ID Storage...')
    await updateOrderWithPayPalId(testOrder.id, paypalOrder.id)
    console.log('✅ Database order updated with PayPal order ID\n')

    // 7. Test PayPal order lookup
    console.log('7. Testing PayPal Order Lookup...')
    const foundOrder = await getOrderByPayPalId(paypalOrder.id)
    if (!foundOrder || foundOrder.id !== testOrder.id) {
      throw new Error('PayPal order lookup failed')
    }
    console.log(`✅ Order lookup by PayPal ID successful: ${foundOrder.id}\n`)

    // 8. Check PayPal order structure
    console.log('8. Checking PayPal Order Structure...')
    const customId = paypalOrder.purchase_units?.[0]?.custom_id
    const referenceId = paypalOrder.purchase_units?.[0]?.reference_id
    
    if (customId !== testOrder.id.toString()) {
      throw new Error(`Custom ID mismatch: expected ${testOrder.id}, got ${customId}`)
    }
    if (referenceId !== testOrder.id.toString()) {
      throw new Error(`Reference ID mismatch: expected ${testOrder.id}, got ${referenceId}`)
    }
    console.log('✅ PayPal order structure is correct\n')

    // 9. Test webhook endpoint accessibility
    console.log('9. Testing Webhook Endpoint...')
    const webhookResponse = await fetch('https://mjkprints.store/api/webhooks/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'webhook_accessibility' })
    })
    
    if (webhookResponse.status === 400) {
      console.log('✅ Webhook endpoint is accessible (returns 400 for invalid signature as expected)\n')
    } else {
      console.warn(`⚠️  Webhook endpoint returned unexpected status: ${webhookResponse.status}\n`)
    }

    console.log('🎉 All PayPal Integration Tests Passed!')
    console.log('\nNext Steps:')
    console.log('1. Configure PayPal webhook URL in PayPal Developer Console:')
    console.log('   https://mjkprints.store/api/webhooks/paypal')
    console.log('2. Test a real payment flow on your website')
    console.log('3. Monitor webhook events in PayPal Developer Console')

  } catch (error) {
    console.error('❌ PayPal Integration Test Failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the test
testPayPalIntegration()