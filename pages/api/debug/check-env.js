// Debug endpoint to check environment variables on production
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end('Method Not Allowed')
  }

  // Only allow with debug key
  const debugKey = req.query.debug
  if (debugKey !== 'mjk-debug-2025') {
    return res.status(403).json({ error: 'Debug access denied' })
  }

  const paypalClientId = process.env.PAYPAL_CLIENT_ID
  const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET
  const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT || 'sandbox'
  const publicClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

  // Mask sensitive data
  const maskedClientId = paypalClientId ? 
    paypalClientId.substring(0, 15) + '...' + paypalClientId.substring(paypalClientId.length - 15) : 
    'NOT_SET'
  
  const maskedClientSecret = paypalClientSecret ? 
    paypalClientSecret.substring(0, 15) + '...' + paypalClientSecret.substring(paypalClientSecret.length - 15) : 
    'NOT_SET'

  const maskedPublicClientId = publicClientId ? 
    publicClientId.substring(0, 15) + '...' + publicClientId.substring(publicClientId.length - 15) : 
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
      backend_clientId: maskedClientId,
      backend_clientSecret: maskedClientSecret,
      frontend_publicClientId: maskedPublicClientId,
      isBackendConfigured: !!(paypalClientId && paypalClientSecret),
      isFrontendConfigured: !!publicClientId,
      backend_clientIdLength: paypalClientId?.length || 0,
      backend_clientSecretLength: paypalClientSecret?.length || 0,
      frontend_clientIdLength: publicClientId?.length || 0,
      credentialsMatch: paypalClientId === publicClientId
    },
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  })
}