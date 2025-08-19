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
    // Environment variable analysis
    const environmentInfo = {
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production',
      deploymentPlatform: process.env.VERCEL ? 'Vercel' : 
                         process.env.NETLIFY ? 'Netlify' : 
                         process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 
                         'Unknown/Local',
      
      // Critical environment variables for URL resolution
      siteUrlConfig: {
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        exists: !!process.env.NEXT_PUBLIC_SITE_URL,
        length: process.env.NEXT_PUBLIC_SITE_URL?.length || 0,
        startsWithHttps: process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'),
        containsLocalhost: process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost'),
        containsMjkprints: process.env.NEXT_PUBLIC_SITE_URL?.includes('mjkprints')
      },

      // Other relevant environment variables
      otherEnvVars: {
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'Set' : 'Missing',
        MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY ? 'Set' : 'Missing',
        MAILERSEND_FROM_EMAIL: process.env.MAILERSEND_FROM_EMAIL
      },

      // URL resolution test
      urlResolutionTest: {
        fallbackValue: 'http://localhost:3001',
        resolvedUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
        wouldUseFallback: !process.env.NEXT_PUBLIC_SITE_URL
      },

      // Platform-specific variables
      platformVars: {
        netlify: process.env.NETLIFY ? {
          deployId: process.env.DEPLOY_ID,
          deployUrl: process.env.DEPLOY_URL,
          deployPrimeUrl: process.env.DEPLOY_PRIME_URL,
          siteId: process.env.SITE_ID,
          context: process.env.CONTEXT
        } : null,
        
        vercel: process.env.VERCEL ? {
          deploymentUrl: process.env.VERCEL_URL,
          environment: process.env.VERCEL_ENV,
          region: process.env.VERCEL_REGION
        } : null
      },

      // Timestamp for tracking when this was checked
      checkedAt: new Date().toISOString(),
      timestamp: Date.now()
    }

    console.log({
      siteUrl: environmentInfo.siteUrlConfig.NEXT_PUBLIC_SITE_URL,
      platform: environmentInfo.deploymentPlatform,
      isProduction: environmentInfo.isProduction
    })

    return res.status(200).json({
      success: true,
      environment: environmentInfo,
      summary: {
        siteUrlConfigured: !!process.env.NEXT_PUBLIC_SITE_URL,
        usingFallback: !process.env.NEXT_PUBLIC_SITE_URL,
        resolvedUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001',
        platform: environmentInfo.deploymentPlatform,
        isProduction: environmentInfo.isProduction
      }
    })

  } catch (error) {
    console.error('[DEBUG-ENV] Error checking environment:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to check environment',
      details: error.message
    })
  }
}