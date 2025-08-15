// Debug endpoint to check PayPal configuration on production
// WARNING: Remove this file after debugging - it exposes sensitive info

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end('Method Not Allowed')
  }

  // Only allow in development or with specific debug key
  const debugKey = req.query.debug
  const isDev = process.env.NODE_ENV === 'development'
  const isAuthorized = debugKey === 'mjk-debug-2025' || isDev

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Debug access denied' })
  }

  const paypalClientId = process.env.PAYPAL_CLIENT_ID
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET
  const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT || 'sandbox'

  // Mask sensitive data
  const maskedClientId = paypalClientId ? 
    paypalClientId.substring(0, 10) + '...' + paypalClientId.substring(paypalClientId.length - 10) : 
    'NOT_SET'
  
  const maskedClientSecret = paypalClientSecret ? 
    paypalClientSecret.substring(0, 10) + '...' + paypalClientSecret.substring(paypalClientSecret.length - 10) : 
    'NOT_SET'

  res.status(200).json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      platform: process.platform,
      isNetlify: !!process.env.NETLIFY,
      isVercel: !!process.env.VERCEL
    },
    paypalConfig: {
      environment: paypalEnvironment,
      clientId: maskedClientId,
      clientSecret: maskedClientSecret,
      isConfigured: !!(paypalClientId && paypalClientSecret),
      clientIdLength: paypalClientId?.length || 0,
      clientSecretLength: paypalClientSecret?.length || 0
    },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  })
}