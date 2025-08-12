import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAdminAuth } from '../context/AdminAuthContext'

export default function PasscodeProtection({ children }) {
  const router = useRouter()
  const {
    isAuthenticated,
    isLoading,
    isLocked,
    lockoutTimeRemaining,
    attemptsRemaining,
    login,
    logout
  } = useAdminAuth()

  const [passcode, setPasscode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  // Auto-focus input on mount
  useEffect(() => {
    if (!isAuthenticated && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAuthenticated])

  // Clear error when passcode changes
  useEffect(() => {
    if (error && passcode) {
      setError('')
    }
  }, [passcode, error])

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Only digits
    if (value.length <= 8) { // Limit length
      setPasscode(value)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (isLocked) {
      setError(`Account locked. Try again in ${lockoutTimeRemaining} minutes.`)
      return
    }

    if (!passcode || passcode.length < 3) {
      setError('Please enter a valid passcode')
      triggerShake()
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const result = await login(passcode)
      
      if (!result.success) {
        setError(result.error)
        setPasscode('')
        triggerShake()

        if (result.isLocked) {
          setError(`Too many failed attempts. Account locked for ${lockoutTimeRemaining} minutes.`)
        } else if (result.attemptsRemaining <= 2) {
          setError(`${result.error}. ${result.attemptsRemaining} attempts remaining.`)
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Connection failed. Please try again.')
      triggerShake()
    } finally {
      setIsSubmitting(false)
      
      // Refocus input for next attempt
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  // Show children if authenticated
  if (isAuthenticated) {
    return <>{children}</>
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Format lockout time
  const formatLockoutTime = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center px-4 relative">
      {/* Back Button */}
      <button
        onClick={handleBackToHome}
        className="absolute top-6 left-6 flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="text-sm font-medium">Back to Home</span>
      </button>

      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary mb-2">Admin Access</h1>
          <p className="text-gray-600">Enter your passcode to continue</p>
        </div>

        {/* Login Form */}
        <div className={`bg-white rounded-xl shadow-xl p-8 ${shake ? 'animate-pulse' : ''}`}>
          <form onSubmit={handleSubmit}>
            {/* Passcode Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passcode
              </label>
              <input
                ref={inputRef}
                type="password"
                value={passcode}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || isLocked}
                className={`w-full px-4 py-3 text-center text-2xl font-mono tracking-wider border-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200 ${
                  error
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                    : 'border-gray-300 focus:ring-primary/20 focus:border-primary'
                } ${isLocked ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder="••••••"
                maxLength="8"
                autoComplete="off"
                inputMode="numeric"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Lockout Message */}
            {isLocked && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-yellow-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Account Temporarily Locked</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Too many failed attempts. Try again in {formatLockoutTime(lockoutTimeRemaining)}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Attempt Counter */}
            {!isLocked && attemptsRemaining < 5 && (
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-600">
                  {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked || !passcode}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
                isSubmitting || isLocked || !passcode
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Verifying...
                </div>
              ) : isLocked ? (
                'Account Locked'
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Secure admin access • Session expires after 2 hours
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2">
            <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Protected by 256-bit encryption
          </div>
        </div>
      </div>
    </div>
  )
}