import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ClientSecurity } from '../utils/security'

const AdminAuthContext = createContext()

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check authentication status on mount and periodically
  useEffect(() => {
    if (!isMounted) return

    checkAuthStatus()
    
    // Set up periodic checks
    const authInterval = setInterval(checkAuthStatus, 30000) // Check every 30 seconds
    const activityInterval = setInterval(updateActivity, 60000) // Update activity every minute

    // Listen for storage changes (logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === ClientSecurity.STORAGE_KEYS.AUTH_TOKEN && !e.newValue) {
        // Token was removed in another tab
        setIsAuthenticated(false)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange)
    }

    return () => {
      clearInterval(authInterval)
      clearInterval(activityInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [isMounted])

  // Update lockout status periodically
  useEffect(() => {
    if (isLocked) {
      const lockoutInterval = setInterval(() => {
        const remaining = ClientSecurity.getLockoutTimeRemaining()
        setLockoutTimeRemaining(remaining)
        
        if (remaining === 0) {
          setIsLocked(false)
          clearInterval(lockoutInterval)
        }
      }, 1000)

      return () => clearInterval(lockoutInterval)
    }
  }, [isLocked])

  const checkAuthStatus = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    const locked = ClientSecurity.isLockedOut()
    setIsLocked(locked)
    
    if (locked) {
      setLockoutTimeRemaining(ClientSecurity.getLockoutTimeRemaining())
      setIsAuthenticated(false)
      setIsLoading(false)
      return
    }

    const sessionValid = ClientSecurity.isSessionValid()
    setIsAuthenticated(sessionValid)
    setIsLoading(false)
  }, [])

  const updateActivity = useCallback(() => {
    if (isAuthenticated) {
      ClientSecurity.updateLastActivity()
    }
  }, [isAuthenticated])

  const login = async (passcode) => {
    if (ClientSecurity.isLockedOut()) {
      throw new Error('Account is temporarily locked. Please try again later.')
    }

    try {
      
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          passcode: passcode
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        ClientSecurity.storeAuthSession(data.token)
        setIsAuthenticated(true)
        setIsLocked(false)
        return { success: true }
      } else {
        const attempts = ClientSecurity.recordFailedAttempt()
        const remaining = ClientSecurity.getRemainingAttempts()

        if (remaining === 0) {
          setIsLocked(true)
          setLockoutTimeRemaining(ClientSecurity.getLockoutTimeRemaining())
        }

        return {
          success: false,
          error: data.error || 'Invalid passcode',
          attemptsRemaining: remaining,
          isLocked: remaining === 0
        }
      }
    } catch (error) {
      console.error('Login request failed:', error)
      return {
        success: false,
        error: 'Connection failed. Please try again.',
        attemptsRemaining: ClientSecurity.getRemainingAttempts()
      }
    }
  }

  const logout = useCallback(() => {
    ClientSecurity.clearSession()
    setIsAuthenticated(false)
  }, [])

  const clearLockout = useCallback(() => {
    ClientSecurity.clearAttempts()
    setIsLocked(false)
    setLockoutTimeRemaining(0)
  }, [])

  const value = {
    isAuthenticated,
    isLoading,
    isLocked,
    lockoutTimeRemaining,
    attemptsRemaining: typeof window !== 'undefined' ? ClientSecurity.getRemainingAttempts() : 5,
    login,
    logout,
    clearLockout,
    updateActivity
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  
  return context
}