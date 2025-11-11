import { ServerSecurity } from '../../../utils/security'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { serialize } from 'cookie'

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
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('DASHBOARD')))
      console.error('NODE_ENV:', process.env.NODE_ENV)
      console.error('All env keys count:', Object.keys(process.env).length)
      
      // Temporary debug info for production (will remove after fixing)
      const debugInfo = {
        availableEnvVars: Object.keys(process.env).filter(k => k.includes('DASHBOARD')),
        nodeEnv: process.env.NODE_ENV,
        envKeysCount: Object.keys(process.env).length,
        hasNetlifyEnvs: Object.keys(process.env).some(k => k.startsWith('NETLIFY')),
        timestamp: new Date().toISOString()
      }
      
      return res.status(500).json({ 
        error: 'Server configuration error',
        debug: debugInfo  // Show in both dev and prod temporarily
      })
    }

    // SECURITY: Use constant-time comparison to prevent timing attacks
    let isValidPasscode = false
    try {
      
      // For backward compatibility, check if it's a hash or plain text
      if (expectedPasscode.startsWith('$2b$')) {
        // It's a bcrypt hash
        isValidPasscode = await bcrypt.compare(passcode, expectedPasscode)
      } else {
        // It's plain text - use constant-time comparison
        // Convert both to buffers for crypto.timingSafeEqual
        const expectedBuffer = Buffer.from(expectedPasscode, 'utf8')
        const providedBuffer = Buffer.from(passcode, 'utf8')
        
        // Ensure same length to prevent length-based attacks
        if (expectedBuffer.length === providedBuffer.length) {
          isValidPasscode = crypto.timingSafeEqual(expectedBuffer, providedBuffer)
        } else {
          // Still perform a comparison to maintain consistent timing
          const dummyBuffer = Buffer.alloc(expectedBuffer.length)
          crypto.timingSafeEqual(expectedBuffer, dummyBuffer)
          isValidPasscode = false
        }
        
        // Log warning for plain text passcode
        if (isValidPasscode) {
          console.warn('⚠️  SECURITY WARNING: Using plain text passcode. Consider using bcrypt hash.')
        }
      }
    } catch (error) {
      console.error('Passcode verification error:', error.message)
      console.error('Error details:', error)
      recordAttempt(clientIP, false)
      return res.status(500).json({ 
        error: 'Authentication error',
        debug: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
      })
    }

    if (!isValidPasscode) {
      recordAttempt(clientIP, false)
      
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

    // SECURITY: Set HTTP-only cookie instead of sending token in response
    const cookieOptions = ServerSecurity.getSecureCookieOptions()
    const sessionCookie = serialize('mjk-admin-session', sessionToken, cookieOptions)
    
    res.setHeader('Set-Cookie', sessionCookie)
    

    // Don't send token in response - it's now in secure HTTP-only cookie
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
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

// Helper function to parse cookies from request
function parseCookies(req) {
  const cookies = {}
  const cookieHeader = req.headers.cookie
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.split('=')
      const value = rest.join('=').trim()
      if (name && value) {
        cookies[name.trim()] = decodeURIComponent(value)
      }
    })
  }
  
  return cookies
}

// Verify admin session middleware (can be used in other admin routes)
export function verifyAdminSession(req, res, next) {
  try {
    // SECURITY: Read session token from HTTP-only cookie
    const cookies = parseCookies(req)
    const sessionToken = cookies['mjk-admin-session']
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session cookie found' })
    }

    const sessionData = ServerSecurity.verifySessionToken(sessionToken)

    if (!sessionData || sessionData.type !== 'admin') {
      // Clear invalid cookie
      const clearCookie = serialize('mjk-admin-session', '', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/' 
      })
      res.setHeader('Set-Cookie', clearCookie)
      
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    // Optional: Verify IP address hasn't changed (prevents session hijacking)
    const clientIP = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'
    
    if (sessionData.ip && sessionData.ip !== clientIP) {
      console.warn(`⚠️  Session IP mismatch: expected ${sessionData.ip}, got ${clientIP}`)
      // Optionally reject or log this - for now just warn
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