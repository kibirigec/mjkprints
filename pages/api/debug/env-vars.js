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
    const envInfo = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      
      // Check critical environment variables (without exposing values)
      environmentCheck: {
        NEXT_PUBLIC_SUPABASE_URL: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasValue: !!process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
          startsCorrectly: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') || false,
          preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...' || 'missing'
        },
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {
          exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          hasValue: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
          startsCorrectly: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false,
          lengthOk: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0) > 100
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasValue: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
          startsCorrectly: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false,
          lengthOk: (process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0) > 100,
          preview: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
            process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + '...' : 'missing'
        },
        DASHBOARD_PASSCODE: {
          exists: !!process.env.DASHBOARD_PASSCODE,
          hasValue: !!process.env.DASHBOARD_PASSCODE?.length,
          isBcryptHash: process.env.DASHBOARD_PASSCODE?.startsWith('$2b$') || false,
          length: process.env.DASHBOARD_PASSCODE?.length || 0
        },
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
          exists: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
          hasValue: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length,
          startsCorrectly: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_') || false
        },
        STRIPE_SECRET_KEY: {
          exists: !!process.env.STRIPE_SECRET_KEY,
          hasValue: !!process.env.STRIPE_SECRET_KEY?.length,
          startsCorrectly: process.env.STRIPE_SECRET_KEY?.startsWith('sk_') || false
        }
      },

      // Environment statistics
      stats: {
        totalEnvVars: Object.keys(process.env).length,
        nextPublicVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).length,
        supabaseVars: Object.keys(process.env).filter(k => k.includes('SUPABASE')).length,
        stripeVars: Object.keys(process.env).filter(k => k.includes('STRIPE')).length,
        deploymentVars: Object.keys(process.env).filter(k => 
          k.startsWith('NETLIFY_') || k.startsWith('VERCEL_') || k.startsWith('RAILWAY_')
        ).length
      },

      // Critical validations
      criticalIssues: []
    }

    // Check for critical issues
    if (!envInfo.environmentCheck.SUPABASE_SERVICE_ROLE_KEY.exists) {
      envInfo.criticalIssues.push({
        severity: 'CRITICAL',
        issue: 'SUPABASE_SERVICE_ROLE_KEY missing',
        impact: 'Admin operations (product deletion) will fail',
        solution: 'Add SUPABASE_SERVICE_ROLE_KEY environment variable with service role key from Supabase Settings → API'
      })
    }

    if (!envInfo.environmentCheck.SUPABASE_SERVICE_ROLE_KEY.startsCorrectly) {
      envInfo.criticalIssues.push({
        severity: 'CRITICAL', 
        issue: 'SUPABASE_SERVICE_ROLE_KEY invalid format',
        impact: 'Admin client authentication will fail',
        solution: 'Ensure SUPABASE_SERVICE_ROLE_KEY starts with "eyJ" (JWT format)'
      })
    }

    if (!envInfo.environmentCheck.NEXT_PUBLIC_SUPABASE_URL.startsCorrectly) {
      envInfo.criticalIssues.push({
        severity: 'HIGH',
        issue: 'NEXT_PUBLIC_SUPABASE_URL invalid format', 
        impact: 'Database connections will fail',
        solution: 'Ensure NEXT_PUBLIC_SUPABASE_URL starts with "https://"'
      })
    }

    if (!envInfo.environmentCheck.DASHBOARD_PASSCODE.exists) {
      envInfo.criticalIssues.push({
        severity: 'HIGH',
        issue: 'DASHBOARD_PASSCODE missing',
        impact: 'Admin authentication will fail',
        solution: 'Add DASHBOARD_PASSCODE environment variable'
      })
    }

    // Add deployment platform detection
    if (Object.keys(process.env).some(k => k.startsWith('NETLIFY_'))) {
      envInfo.deploymentPlatform = 'Netlify'
    } else if (Object.keys(process.env).some(k => k.startsWith('VERCEL_'))) {
      envInfo.deploymentPlatform = 'Vercel'
    } else if (Object.keys(process.env).some(k => k.startsWith('RAILWAY_'))) {
      envInfo.deploymentPlatform = 'Railway'
    } else {
      envInfo.deploymentPlatform = 'Unknown/Custom'
    }

      criticalIssues: envInfo.criticalIssues.length,
      platform: envInfo.deploymentPlatform,
      hasServiceRole: envInfo.environmentCheck.SUPABASE_SERVICE_ROLE_KEY.exists
    })

    return res.status(200).json(envInfo)

  } catch (error) {
    console.error('[ENV-DEBUG] Error checking environment:', error)
    return res.status(500).json({
      error: 'Failed to check environment variables',
      details: error.message
    })
  }
}