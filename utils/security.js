import crypto from 'crypto'

// Security configuration
const SECURITY_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  SESSION_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  INACTIVITY_TIMEOUT: 30 * 60 * 1000 // 30 minutes in milliseconds
}

// Client-side security utilities
export class ClientSecurity {
  static STORAGE_KEYS = {
    AUTH_TOKEN: 'mjk-admin-token',
    ATTEMPTS: 'mjk-admin-attempts',
    LOCKOUT: 'mjk-admin-lockout',
    LAST_ACTIVITY: 'mjk-admin-activity'
  }

  // Generate secure session token
  static generateToken() {
    return `mjk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Check if currently locked out
  static isLockedOut() {
    if (typeof window === 'undefined') return false
    
    const lockout = sessionStorage.getItem(this.STORAGE_KEYS.LOCKOUT)
    if (!lockout) return false

    const lockoutTime = parseInt(lockout)
    const now = Date.now()

    if (now > lockoutTime) {
      // Lockout expired, clear it
      sessionStorage.removeItem(this.STORAGE_KEYS.LOCKOUT)
      sessionStorage.removeItem(this.STORAGE_KEYS.ATTEMPTS)
      return false
    }

    return true
  }

  // Get remaining lockout time in minutes
  static getLockoutTimeRemaining() {
    if (typeof window === 'undefined') return 0
    
    const lockout = sessionStorage.getItem(this.STORAGE_KEYS.LOCKOUT)
    if (!lockout) return 0

    const lockoutTime = parseInt(lockout)
    const now = Date.now()
    const remaining = Math.max(0, lockoutTime - now)

    return Math.ceil(remaining / (60 * 1000)) // Convert to minutes
  }

  // Record failed attempt
  static recordFailedAttempt() {
    if (typeof window === 'undefined') return 0
    
    const attempts = this.getAttempts() + 1
    sessionStorage.setItem(this.STORAGE_KEYS.ATTEMPTS, attempts.toString())

    if (attempts >= SECURITY_CONFIG.MAX_ATTEMPTS) {
      // Trigger lockout
      const lockoutUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION
      sessionStorage.setItem(this.STORAGE_KEYS.LOCKOUT, lockoutUntil.toString())
      console.warn('🔒 Admin access locked due to too many failed attempts')
    }

    return attempts
  }

  // Get current attempt count
  static getAttempts() {
    if (typeof window === 'undefined') return 0
    
    const attempts = sessionStorage.getItem(this.STORAGE_KEYS.ATTEMPTS)
    return attempts ? parseInt(attempts) : 0
  }

  // Get remaining attempts before lockout
  static getRemainingAttempts() {
    return Math.max(0, SECURITY_CONFIG.MAX_ATTEMPTS - this.getAttempts())
  }

  // Clear failed attempts (on successful login)
  static clearAttempts() {
    if (typeof window === 'undefined') return
    
    sessionStorage.removeItem(this.STORAGE_KEYS.ATTEMPTS)
    sessionStorage.removeItem(this.STORAGE_KEYS.LOCKOUT)
  }

  // Store authenticated session
  static storeAuthSession(token) {
    if (typeof window === 'undefined') return
    
    const sessionData = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT
    }

    sessionStorage.setItem(this.STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(sessionData))
    this.updateLastActivity()
    this.clearAttempts()
  }

  // Check if session is valid
  static isSessionValid() {
    if (typeof window === 'undefined') return false
    
    const sessionData = this.getSession()
    if (!sessionData) return false

    const now = Date.now()
    
    // Check expiration
    if (now > sessionData.expiresAt) {
      this.clearSession()
      return false
    }

    // Check inactivity
    const lastActivity = this.getLastActivity()
    if (lastActivity && (now - lastActivity) > SECURITY_CONFIG.INACTIVITY_TIMEOUT) {
      this.clearSession()
      return false
    }

    return true
  }

  // Get session data
  static getSession() {
    if (typeof window === 'undefined') return null
    
    try {
      const sessionStr = sessionStorage.getItem(this.STORAGE_KEYS.AUTH_TOKEN)
      if (!sessionStr) return null

      return JSON.parse(sessionStr)
    } catch (error) {
      console.error('Failed to parse session data:', error)
      this.clearSession()
      return null
    }
  }

  // Update last activity timestamp
  static updateLastActivity() {
    if (typeof window === 'undefined') return
    
    sessionStorage.setItem(this.STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString())
  }

  // Get last activity timestamp
  static getLastActivity() {
    if (typeof window === 'undefined') return null
    
    const activity = sessionStorage.getItem(this.STORAGE_KEYS.LAST_ACTIVITY)
    return activity ? parseInt(activity) : null
  }

  // Clear all session data
  static clearSession() {
    if (typeof window === 'undefined') return
    
    sessionStorage.removeItem(this.STORAGE_KEYS.AUTH_TOKEN)
    sessionStorage.removeItem(this.STORAGE_KEYS.LAST_ACTIVITY)
  }

  // Clear all security data (including attempts)
  static clearAllData() {
    if (typeof window === 'undefined') return
    
    Object.values(this.STORAGE_KEYS).forEach(key => {
      sessionStorage.removeItem(key)
    })
  }
}

// Server-side security utilities (for API routes)
export class ServerSecurity {
  // Hash passcode for comparison
  static hashPasscode(passcode) {
    return crypto.createHash('sha256').update(passcode).digest('hex')
  }

  // Verify passcode against hash
  static verifyPasscode(inputPasscode, expectedHash) {
    const inputHash = this.hashPasscode(inputPasscode)
    return inputHash === expectedHash
  }

  // Generate secure response token
  static generateResponseToken() {
    return crypto.randomBytes(32).toString('hex')
  }

  // Create secure session token with payload
  static createSessionToken(payload) {
    const data = {
      ...payload,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex')
    }

    const jsonData = JSON.stringify(data)
    const token = Buffer.from(jsonData).toString('base64')
    
    return token
  }

  // Get secure cookie options
  static getSecureCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SECURITY_CONFIG.SESSION_TIMEOUT / 1000, // Convert to seconds
      path: '/'
    }
  }

  // Verify session token
  static verifySessionToken(token) {
    try {
      const jsonData = Buffer.from(token, 'base64').toString('utf-8')
      const data = JSON.parse(jsonData)

      // Check age (tokens expire after 2 hours)
      const age = Date.now() - data.timestamp
      if (age > SECURITY_CONFIG.SESSION_TIMEOUT) {
        return null
      }

      return data
    } catch (error) {
      console.error('Invalid session token:', error)
      return null
    }
  }
}

export default {
  ClientSecurity,
  ServerSecurity,
  SECURITY_CONFIG
}