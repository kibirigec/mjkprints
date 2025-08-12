// Debug endpoint to check environment variables in production
export default function handler(req, res) {
  // Only allow in development or with a special debug token
  const debugToken = req.headers['x-debug-token']
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && debugToken !== 'mjk-debug-2024') {
    return res.status(404).json({ error: 'Not found' })
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