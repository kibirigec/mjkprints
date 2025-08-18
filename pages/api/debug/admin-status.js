import { verifyAdminSession } from '../admin/auth'
import { ServerSecurity } from '../../../utils/security'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    authenticationTest: {},
    sessionInfo: {},
    cookieInfo: {}
  }

  try {
    // Test 1: Check if admin session exists and is valid
    
    try {
      const sessionToken = req.cookies?.['mjk-admin-session']
      
      debugInfo.cookieInfo = {
        hasCookie: !!sessionToken,
        cookieLength: sessionToken?.length || 0,
        cookiePreview: sessionToken ? sessionToken.substring(0, 20) + '...' : 'none'
      }

      if (sessionToken) {
        // Try to verify the session token
        const sessionData = ServerSecurity.verifySessionToken(sessionToken)
        
        debugInfo.sessionInfo = {
          tokenValid: !!sessionData,
          sessionType: sessionData?.type || 'unknown',
          hasExpiry: !!sessionData?.exp,
          isExpired: sessionData?.exp ? sessionData.exp < Date.now() / 1000 : false,
          clientIP: sessionData?.ip || 'unknown',
          userAgent: sessionData?.userAgent ? sessionData.userAgent.substring(0, 50) + '...' : 'unknown'
        }
      }

      // Try full authentication
      const isAuthenticated = verifyAdminSession(req, res)
      
      debugInfo.authenticationTest = {
        success: !!isAuthenticated,
        method: 'verifyAdminSession',
        timestamp: new Date().toISOString()
      }

      if (!isAuthenticated) {
        debugInfo.authenticationTest.failureReason = 'Admin session verification failed'
      }

    } catch (authError) {
      debugInfo.authenticationTest = {
        success: false,
        error: authError.message,
        errorType: authError.name,
        method: 'verifyAdminSession'
      }
    }

    // Test 2: Check environment variables needed for authentication
    debugInfo.environmentCheck = {
      hasDashboardPasscode: !!process.env.DASHBOARD_PASSCODE,
      passcodeType: process.env.DASHBOARD_PASSCODE?.startsWith('$2b$') ? 'bcrypt_hash' : 'plain_text',
      hasSecurityUtils: !!ServerSecurity,
      canCreateTokens: typeof ServerSecurity.createSessionToken === 'function',
      canVerifyTokens: typeof ServerSecurity.verifySessionToken === 'function'
    }

    // Test 3: Security utility functions
    try {
      debugInfo.securityTest = {
        canGenerateSession: false,
        canVerifySession: false
      }

      // Test token generation (safe test)
      if (ServerSecurity.createSessionToken) {
        const testToken = ServerSecurity.createSessionToken({
          type: 'test',
          ip: '127.0.0.1',
          userAgent: 'test'
        })
        debugInfo.securityTest.canGenerateSession = !!testToken
      }

      // Test token verification (safe test)  
      if (ServerSecurity.verifySessionToken && debugInfo.securityTest.canGenerateSession) {
        const testToken = ServerSecurity.createSessionToken({
          type: 'test',
          ip: '127.0.0.1', 
          userAgent: 'test'
        })
        const verified = ServerSecurity.verifySessionToken(testToken)
        debugInfo.securityTest.canVerifySession = !!verified
      }

    } catch (securityError) {
      debugInfo.securityTest = {
        error: securityError.message,
        errorType: securityError.name
      }
    }

    // Test 4: Request details
    debugInfo.requestInfo = {
      method: req.method,
      hasUserAgent: !!req.headers['user-agent'],
      hasForwardedFor: !!req.headers['x-forwarded-for'],
      cookieCount: Object.keys(req.cookies || {}).length,
      allCookies: Object.keys(req.cookies || {})
    }

    // Summary
    debugInfo.summary = {
      isAuthenticated: debugInfo.authenticationTest.success,
      hasValidSession: debugInfo.sessionInfo.tokenValid && !debugInfo.sessionInfo.isExpired,
      hasRequiredEnvVars: debugInfo.environmentCheck.hasDashboardPasscode,
      securityUtilsWorking: debugInfo.securityTest.canGenerateSession && debugInfo.securityTest.canVerifySession,
      overallStatus: debugInfo.authenticationTest.success ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED'
    }

      authenticated: debugInfo.summary.isAuthenticated,
      hasSession: debugInfo.summary.hasValidSession,
      status: debugInfo.summary.overallStatus
    })

    return res.status(200).json(debugInfo)

  } catch (error) {
    console.error('[ADMIN-DEBUG] Error testing admin status:', error)
    return res.status(500).json({
      error: 'Failed to test admin authentication',
      details: error.message,
      partialDebugInfo: debugInfo
    })
  }
}