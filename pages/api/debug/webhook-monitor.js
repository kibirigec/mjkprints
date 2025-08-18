import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  try {
    // Webhook configuration analysis
    const webhookInfo = {
      configuration: {
        endpointSecret: {
          exists: !!process.env.STRIPE_WEBHOOK_SECRET,
          format: process.env.STRIPE_WEBHOOK_SECRET ? 
            (process.env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_') ? 'Valid' : 'Invalid') : 
            'Missing',
          preview: process.env.STRIPE_WEBHOOK_SECRET ? 
            process.env.STRIPE_WEBHOOK_SECRET.substring(0, 12) + '...' : 
            'Not set'
        },
        
        stripeKeys: {
          secretKey: process.env.STRIPE_SECRET_KEY ? 
            (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'Test Key' : 
             process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Live Key' : 'Invalid') : 
            'Missing',
          publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 
            (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ? 'Test Key' : 
             process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_') ? 'Live Key' : 'Invalid') : 
            'Missing'
        }
      },

      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production',
        platform: process.env.VERCEL ? 'Vercel' : 
                 process.env.NETLIFY ? 'Netlify' : 
                 'Local/Other',
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL
      },

      webhookEndpoint: {
        expectedUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mjkprints.store'}/api/webhooks/stripe`,
        isAccessible: true, // We'll assume it's accessible since we can call this endpoint
        bodyParserDisabled: true // This should be disabled for webhook signature verification
      },

      requiredEvents: [
        'checkout.session.completed',
        'payment_intent.succeeded', 
        'payment_intent.payment_failed'
      ],

      troubleshooting: {
        keyMismatch: process.env.STRIPE_SECRET_KEY?.includes('test') !== process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('test'),
        webhookSecretFormat: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
        productionReady: process.env.NODE_ENV === 'production' && 
                        process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') &&
                        process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')
      },

      emailService: {
        mailerSendConfigured: !!process.env.MAILERSEND_API_KEY,
        fromEmailSet: !!process.env.MAILERSEND_FROM_EMAIL,
        fromEmail: process.env.MAILERSEND_FROM_EMAIL
      },

      checkedAt: new Date().toISOString()
    }

    // Log the webhook monitoring check
      hasSecret: webhookInfo.configuration.endpointSecret.exists,
      environment: webhookInfo.environment.nodeEnv,
      platform: webhookInfo.environment.platform,
      siteUrl: webhookInfo.environment.siteUrl
    })

    return res.status(200).json({
      success: true,
      webhook: webhookInfo,
      summary: {
        webhookConfigured: webhookInfo.configuration.endpointSecret.exists && 
                          webhookInfo.configuration.endpointSecret.format === 'Valid',
        stripeKeysValid: webhookInfo.configuration.stripeKeys.secretKey !== 'Missing' && 
                        webhookInfo.configuration.stripeKeys.publishableKey !== 'Missing',
        emailConfigured: webhookInfo.emailService.mailerSendConfigured && 
                        webhookInfo.emailService.fromEmailSet,
        productionReady: webhookInfo.troubleshooting.productionReady,
        potentialIssues: [
          ...(webhookInfo.troubleshooting.keyMismatch ? ['Stripe key environment mismatch (test/live)'] : []),
          ...(!webhookInfo.troubleshooting.webhookSecretFormat ? ['Invalid webhook secret format'] : []),
          ...(!webhookInfo.emailService.mailerSendConfigured ? ['MailerSend not configured'] : [])
        ]
      }
    })

  } catch (error) {
    console.error('[WEBHOOK-MONITOR] Error checking webhook configuration:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check webhook configuration',
      details: error.message
    })
  }
}