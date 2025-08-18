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

  try {
    // 1. Test PayPal configuration
    if (!isPayPalAvailable()) {
      throw new Error('PayPal is not configured properly')
    }

    // 2. Test environment variables
    const requiredVars = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID']
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing environment variable: ${varName}`)
      }
    }

    // 3. Test database order creation
    const testOrder = await createOrder({
      email: 'test@mjkprints.store',
      total_amount: 19.99,
      status: 'pending',
      billing_details: { email: 'test@mjkprints.store', name: 'Test Customer' },
      metadata: { source: 'paypal_test', test: true }
    })

    // 4. Test order items creation
    await createOrderItems(testOrder.id, [
      {
        product_id: '3ee6d148-8a2d-409a-bd1a-a5e892df4907', // Use existing product ID
        quantity: 1,
        unit_price: 19.99
      }
    ])

    // 5. Test PayPal order creation
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

    // 6. Test updating order with PayPal ID
    await updateOrderWithPayPalId(testOrder.id, paypalOrder.id)

    // 7. Test PayPal order lookup
    const foundOrder = await getOrderByPayPalId(paypalOrder.id)
    if (!foundOrder || foundOrder.id !== testOrder.id) {
      throw new Error('PayPal order lookup failed')
    }

    // 8. Check PayPal order structure
    const customId = paypalOrder.purchase_units?.[0]?.custom_id
    const referenceId = paypalOrder.purchase_units?.[0]?.reference_id
    
    if (customId !== testOrder.id.toString()) {
      throw new Error(`Custom ID mismatch: expected ${testOrder.id}, got ${customId}`)
    }
    if (referenceId !== testOrder.id.toString()) {
      throw new Error(`Reference ID mismatch: expected ${testOrder.id}, got ${referenceId}`)
    }

    // 9. Test webhook endpoint accessibility
    const webhookResponse = await fetch('https://mjkprints.store/api/webhooks/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'webhook_accessibility' })
    })
    
    if (webhookResponse.status === 400) {
    } else {
      console.warn(`⚠️  Webhook endpoint returned unexpected status: ${webhookResponse.status}\n`)
    }


  } catch (error) {
    console.error('❌ PayPal Integration Test Failed:', error.message)
    console.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Run the test
testPayPalIntegration()