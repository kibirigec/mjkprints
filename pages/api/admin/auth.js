import { ServerSecurity } from '../../../utils/security'

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map()
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const MAX_ATTEMPTS_PER_IP = 10

// Clean up old rate limit entries
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000) // Clean every 5 minutes

function getRateLimit(ip) {
  const now = Date.now()
  const key = `rate_limit_${ip}`
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      attempts: 0,
      firstAttempt: now,
      lastAttempt: now
    })
  }
  
  return rateLimitStore.get(key)
}

function isRateLimited(ip) {
  const rateLimit = getRateLimit(ip)
  const now = Date.now()
  
  // Reset if window has passed
  if (now - rateLimit.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimit.attempts = 0
    rateLimit.firstAttempt = now
  }
  
  return rateLimit.attempts >= MAX_ATTEMPTS_PER_IP
}

function recordAttempt(ip, success = false) {
  const rateLimit = getRateLimit(ip)
  const now = Date.now()
  
  if (!success) {
    rateLimit.attempts += 1
  } else {
    // Reset on successful login
    rateLimit.attempts = 0
    rateLimit.firstAttempt = now
  }
  
  rateLimit.lastAttempt = now
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get client IP for rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown'

  // Check rate limiting
  if (isRateLimited(clientIP)) {
    console.warn(`🚫 Rate limited IP: ${clientIP}`)
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000 / 60) // minutes
    })
  }

  try {
    const { action, passcode } = req.body

    if (action !== 'login') {
      return res.status(400).json({ error: 'Invalid action' })
    }

    if (!passcode) {
      recordAttempt(clientIP, false)
      return res.status(400).json({ error: 'Passcode is required' })
    }

    // Get expected passcode from environment
    const expectedPasscode = process.env.DASHBOARD_PASSCODE
    
    if (!expectedPasscode) {
      console.error('❌ DASHBOARD_PASSCODE environment variable not set')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Verify passcode (simple string comparison for digits)
    const isValidPasscode = passcode === expectedPasscode

    if (!isValidPasscode) {
      recordAttempt(clientIP, false)
      console.log(`🔐 Invalid passcode attempt from IP: ${clientIP}`)
      
      return res.status(401).json({
        error: 'Invalid passcode',
        timestamp: new Date().toISOString()
      })
    }

    // Successful authentication
    recordAttempt(clientIP, true)
    
    // Generate secure session token
    const sessionToken = ServerSecurity.createSessionToken({
      type: 'admin',
      ip: clientIP,
      userAgent: req.headers['user-agent']
    })

    console.log(`✅ Successful admin login from IP: ${clientIP}`)

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token: sessionToken,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
    })

  } catch (error) {
    console.error('Admin auth error:', error)
    recordAttempt(clientIP, false)
    
    return res.status(500).json({
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

// Verify admin session middleware (can be used in other admin routes)
export function verifyAdminSession(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    const token = authHeader.substring(7)
    const sessionData = ServerSecurity.verifySessionToken(token)

    if (!sessionData || sessionData.type !== 'admin') {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    // Add session data to request
    req.adminSession = sessionData
    
    if (next) {
      next()
    } else {
      return true
    }
  } catch (error) {
    console.error('Session verification error:', error)
    return res.status(401).json({ error: 'Session verification failed' })
  }
}