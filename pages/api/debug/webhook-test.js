import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      return // Response already sent by verifyAdminSession
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { testType, orderId } = req.body

  try {

    // Test basic webhook endpoint accessibility
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/webhooks/stripe`
    

    // Simulate a webhook test by making a request to the webhook endpoint
    // Note: This will fail signature verification (expected) but will test accessibility
    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'test-signature', // This will fail verification
        },
        body: JSON.stringify({
          test: true,
          type: 'webhook.test',
          data: { object: { test: true } }
        })
      })

      const responseText = await testResponse.text()

      // Check webhook configuration
      const webhookConfig = {
        endpointUrl: webhookUrl,
        accessible: testResponse.status !== 0, // 0 would indicate network error
        expectedFailure: testResponse.status === 400, // Should fail with 400 due to invalid signature
        responseStatus: testResponse.status,
        responseBody: responseText
      }

      // Check environment variables needed for webhook processing
      const envCheck = {
        STRIPE_WEBHOOK_SECRET: {
          exists: !!process.env.STRIPE_WEBHOOK_SECRET,
          format: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_') ? 'Valid' : 'Invalid',
          preview: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 12) + '...' || 'Not set'
        },
        STRIPE_SECRET_KEY: {
          exists: !!process.env.STRIPE_SECRET_KEY,
          type: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'Test' : 
                process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'Live' : 'Invalid'
        },
        EMAIL_SERVICE: {
          mailerSendConfigured: !!process.env.MAILERSEND_API_KEY,
          fromEmail: process.env.MAILERSEND_FROM_EMAIL || 'Not set'
        }
      }

      // Database connectivity test (basic)
      let dbCheck = { accessible: false, error: null }
      try {
        // Import Supabase here to test connectivity
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        )
        
        const { data, error } = await supabase.from('orders').select('id').limit(1)
        dbCheck.accessible = !error
        if (error) dbCheck.error = error.message
      } catch (dbError) {
        dbCheck.error = dbError.message
      }

      return res.status(200).json({
        success: true,
        testResults: {
          webhookEndpoint: webhookConfig,
          environmentVariables: envCheck,
          database: dbCheck,
          timestamp: new Date().toISOString()
        },
        summary: {
          webhookAccessible: webhookConfig.accessible,
          configurationValid: envCheck.STRIPE_WEBHOOK_SECRET.exists && 
                             envCheck.STRIPE_SECRET_KEY.exists &&
                             envCheck.EMAIL_SERVICE.mailerSendConfigured,
          databaseConnected: dbCheck.accessible,
          readyForWebhooks: webhookConfig.accessible && 
                           envCheck.STRIPE_WEBHOOK_SECRET.format === 'Valid' &&
                           dbCheck.accessible
        },
        recommendations: [
          ...(!webhookConfig.accessible ? ['Webhook endpoint is not accessible'] : []),
          ...(!envCheck.STRIPE_WEBHOOK_SECRET.exists ? ['STRIPE_WEBHOOK_SECRET environment variable missing'] : []),
          ...(envCheck.STRIPE_WEBHOOK_SECRET.format === 'Invalid' ? ['STRIPE_WEBHOOK_SECRET format is invalid'] : []),
          ...(!envCheck.EMAIL_SERVICE.mailerSendConfigured ? ['MailerSend API key not configured'] : []),
          ...(!dbCheck.accessible ? ['Database connection failed'] : [])
        ]
      })

    } catch (fetchError) {
      console.error('[WEBHOOK-TEST] Error testing webhook endpoint:', fetchError)
      return res.status(500).json({
        success: false,
        error: 'Failed to test webhook endpoint',
        details: fetchError.message,
        webhookUrl
      })
    }

  } catch (error) {
    console.error('[WEBHOOK-TEST] Error in webhook test:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to run webhook test',
      details: error.message
    })
  }
}