/**
 * PayPal Production Webhook Test Script
 * Tests PayPal webhook endpoint on production site
 */

import { config } from 'dotenv'
import fetch from 'node-fetch'

// Load environment variables
config({ path: '.env.local' })

async function testProductionPayPalWebhook() {
  console.log('🧪 Testing PayPal Webhook on Production...\n')

  // Use production URL from environment or prompt for it
  const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mjkprints.store'
  const webhookUrl = `${productionUrl}/api/webhooks/paypal`

  console.log(`Production Webhook URL: ${webhookUrl}`)

  // Test webhook payload - simulating a payment capture completed event
  const testPayload = {
    id: 'WH-test-production-event',
    event_version: '1.0',
    create_time: new Date().toISOString(),
    resource_type: 'capture',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    summary: 'Payment completed for production test',
    resource: {
      id: 'test-production-capture-id',
      status: 'COMPLETED',
      amount: {
        currency_code: 'USD',
        value: '24.98'
      },
      final_capture: true,
      seller_protection: {
        status: 'ELIGIBLE'
      },
      custom_id: 'test-production-order-' + Date.now(),
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString(),
      supplementary_data: {
        related_ids: {
          order_id: 'test-paypal-production-order'
        }
      },
      payer: {
        email_address: 'test@mjkprints.com',
        payer_id: 'test-production-payer'
      }
    },
    links: [
      {
        href: `https://api.sandbox.paypal.com/v1/notifications/webhooks-events/WH-test-production-event`,
        rel: 'self',
        method: 'GET'
      }
    ]
  }

  // Mock PayPal webhook headers
  const mockHeaders = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-id': 'test-production-cert-id',
    'paypal-transmission-id': 'test-production-transmission-id',
    'paypal-transmission-sig': 'test-production-signature',
    'paypal-transmission-time': new Date().toISOString()
  }

  console.log('1. Testing production webhook endpoint...')
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayPal-Test-Script/1.0',
        ...mockHeaders
      },
      body: JSON.stringify(testPayload)
    })

    console.log(`   Response Status: ${response.status}`)
    console.log(`   Response Headers:`, Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const responseData = await response.json()
      console.log('✅ Production webhook endpoint responded successfully')
      console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
    } else {
      const errorText = await response.text()
      console.log('⚠️  Production webhook endpoint returned error')
      console.log(`   Status: ${response.status}`)
      console.log(`   Error: ${errorText}`)
      
      if (response.status === 400 && errorText.includes('signature')) {
        console.log('\n💡 This is expected - webhook signature verification failed')
        console.log('   The production webhook handler is working but rejecting unsigned test requests')
        console.log('   In production, PayPal will provide valid signatures')
      }
      
      if (response.status === 405) {
        console.log('\n❌ Method not allowed - check if webhook endpoint exists')
      }
    }

  } catch (error) {
    console.log('❌ Failed to reach production webhook endpoint')
    console.error(`   Error: ${error.message}`)
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Troubleshooting Tips:')
      console.log('   - Check if the production site is accessible')
      console.log('   - Verify the production URL is correct')
      console.log('   - Ensure the site is deployed and running')
    }
  }

  console.log('\n2. PayPal Developer Console Setup Instructions:')
  console.log('   🔗 Go to: https://developer.paypal.com/developer/applications')
  console.log('   📝 Steps:')
  console.log('   1. Select your app or create a new one')
  console.log('   2. Go to "Webhooks" section')
  console.log('   3. Click "Add Webhook"')
  console.log(`   4. Enter webhook URL: ${webhookUrl}`)
  console.log('   5. Select events to listen for:')
  console.log('      - PAYMENT.CAPTURE.COMPLETED')
  console.log('      - CHECKOUT.ORDER.APPROVED')
  console.log('      - PAYMENT.CAPTURE.DENIED')
  console.log('   6. Save and copy the Webhook ID to your environment variables')

  console.log('\n📋 Production Webhook Test Summary:')
  console.log('   - Production endpoint accessibility: Check output above')
  console.log('   - Event payload structure: Valid PayPal format used')
  console.log('   - Next: Configure real webhook in PayPal Developer Console')

  console.log('\n💡 Environment Variables Needed:')
  console.log('   PAYPAL_WEBHOOK_ID=your_webhook_id_from_paypal_console')
  console.log('   PAYPAL_CLIENT_ID=your_production_client_id (for live)')
  console.log('   PAYPAL_CLIENT_SECRET=your_production_secret (for live)')
  console.log('   PAYPAL_ENVIRONMENT=live (for production)')
}

// Run the test
testProductionPayPalWebhook().catch(console.error)