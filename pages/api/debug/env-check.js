// Debug endpoint to check environment variables in production
export default function handler(req, res) {
  // Allow access with debug token or in development
  const debugToken = req.headers['x-debug-token'] || req.query.debug
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && debugToken !== 'mjk-debug-2024') {
    return res.status(200).json({ 
      error: 'Access denied',
      hint: 'Add ?debug=mjk-debug-2024 to URL or X-Debug-Token header',
      timestamp: new Date().toISOString()
    })
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    hasPasscode: !!process.env.DASHBOARD_PASSCODE,
    passcodeLength: process.env.DASHBOARD_PASSCODE?.length || 0,
    passcodeStartsWithHash: process.env.DASHBOARD_PASSCODE?.startsWith('$2b$') || false,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    timestamp: new Date().toISOString()
  }

  console.log('🔍 Environment check:', envCheck)

  return res.status(200).json({
    success: true,
    environment: envCheck,
    message: 'Environment variables check completed'
  })
}