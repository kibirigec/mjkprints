import { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import PasscodeProtection from '../components/PasscodeProtection'

export default function DebugProduction() {
  const { isAuthenticated } = useAdminAuth()
  const [envResults, setEnvResults] = useState(null)
  const [authResults, setAuthResults] = useState(null)
  const [dbResults, setDbResults] = useState(null)
  const [emailResults, setEmailResults] = useState(null)
  const [environmentResults, setEnvironmentResults] = useState(null)
  const [webhookResults, setWebhookResults] = useState(null)
  const [webhookTestResults, setWebhookTestResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [webhookTestLoading, setWebhookTestLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('modiqube@gmail.com')

  const runEnvironmentTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/env-vars')
      const result = await response.json()
      setEnvResults(result)
    } catch (error) {
      setEnvResults({ error: error.message })
    }
    setLoading(false)
  }

  const runAuthTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/admin-status')
      const result = await response.json()
      setAuthResults(result)
    } catch (error) {
      setAuthResults({ error: error.message })
    }
    setLoading(false)
  }

  const runDatabaseTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/database-permissions')
      const result = await response.json()
      setDbResults(result)
    } catch (error) {
      setDbResults({ error: error.message })
    }
    setLoading(false)
  }

  const runEmailTest = async () => {
    setEmailLoading(true)
    try {
      const response = await fetch('/api/debug/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'order-confirmation',
          recipient: testEmail
        })
      })
      const result = await response.json()
      setEmailResults(result)
    } catch (error) {
      setEmailResults({ error: error.message, success: false })
    }
    setEmailLoading(false)
  }

  const runEnvironmentDebugTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/environment')
      const result = await response.json()
      setEnvironmentResults(result)
    } catch (error) {
      setEnvironmentResults({ error: error.message })
    }
    setLoading(false)
  }

  const runWebhookMonitorTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/webhook-monitor')
      const result = await response.json()
      setWebhookResults(result)
    } catch (error) {
      setWebhookResults({ error: error.message })
    }
    setLoading(false)
  }

  const runWebhookTest = async () => {
    setWebhookTestLoading(true)
    try {
      const response = await fetch('/api/debug/webhook-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testType: 'endpoint-accessibility'
        })
      })
      const result = await response.json()
      setWebhookTestResults(result)
    } catch (error) {
      setWebhookTestResults({ error: error.message, success: false })
    }
    setWebhookTestLoading(false)
  }

  const runAllTests = async () => {
    setLoading(true)
    await Promise.all([
      runEnvironmentTest(),
      runAuthTest(), 
      runDatabaseTest(),
      runEnvironmentDebugTest(),
      runWebhookMonitorTest()
    ])
    setLoading(false)
  }

  const getStatusColor = (status) => {
    if (status === 'READY' || status === 'AUTHENTICATED' || status === true) return 'text-green-600'
    if (status === 'ISSUES_FOUND' || status === 'NOT_AUTHENTICATED' || status === false) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getStatusIcon = (status) => {
    if (status === 'READY' || status === 'AUTHENTICATED' || status === true) return '✅'
    if (status === 'ISSUES_FOUND' || status === 'NOT_AUTHENTICATED' || status === false) return '❌'
    return '⚠️'
  }

  if (!isAuthenticated) {
    return (
      <PasscodeProtection>
        <div>Loading...</div>
      </PasscodeProtection>
    )
  }

  return (
    <PasscodeProtection>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔧 Production Debug Center
          </h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex space-x-4 mb-4">
              <button
                onClick={runAllTests}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '⏳ Running All Tests...' : '🚀 Run All Tests'}
              </button>
              <button
                onClick={runEnvironmentTest}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                🌍 Environment Test
              </button>
              <button
                onClick={runAuthTest}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
              >
                🔐 Auth Test
              </button>
              <button
                onClick={runDatabaseTest}
                disabled={loading}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
              >
                🗄️ Database Test
              </button>
              <button
                onClick={runEnvironmentDebugTest}
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                🌐 URL Debug
              </button>
              <button
                onClick={runWebhookMonitorTest}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                🔌 Webhook Check
              </button>
            </div>
            
            {/* Email Test Section */}
            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-semibold mb-3">📧 Email System Test</h3>
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={runEmailTest}
                  disabled={emailLoading || !testEmail}
                  className="bg-pink-600 text-white px-4 py-2 rounded hover:bg-pink-700 disabled:opacity-50"
                >
                  {emailLoading ? '⏳ Sending...' : '📧 Send Test Email'}
                </button>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={runWebhookTest}
                  disabled={webhookTestLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {webhookTestLoading ? '⏳ Testing...' : '🔌 Test Webhook Delivery'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Email test: Sends sample order confirmation • Webhook test: Checks if webhooks can reach the server
              </p>
            </div>
            
            {/* Quick Status Overview */}
            {(envResults || authResults || dbResults) && (
              <div className="bg-gray-50 rounded p-4">
                <h3 className="font-semibold mb-2">Status Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(envResults?.criticalIssues?.length === 0)}</span>
                    <span className={getStatusColor(envResults?.criticalIssues?.length === 0)}>
                      Environment: {envResults?.criticalIssues?.length === 0 ? 'OK' : `${envResults?.criticalIssues?.length || '?'} Issues`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(authResults?.summary?.overallStatus)}</span>
                    <span className={getStatusColor(authResults?.summary?.overallStatus)}>
                      Authentication: {authResults?.summary?.overallStatus || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>{getStatusIcon(dbResults?.summary?.overallStatus)}</span>
                    <span className={getStatusColor(dbResults?.summary?.overallStatus)}>
                      Database: {dbResults?.summary?.overallStatus || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Environment Variables Results */}
          {envResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🌍 Environment Variables</h2>
              
              {envResults.criticalIssues?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">Critical Issues Found:</h3>
                  {envResults.criticalIssues.map((issue, index) => (
                    <div key={index} className="mb-3 text-sm">
                      <div className="font-medium text-red-700">{issue.severity}: {issue.issue}</div>
                      <div className="text-red-600">Impact: {issue.impact}</div>
                      <div className="text-red-600">Solution: {issue.solution}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Critical Variables</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>SUPABASE_SERVICE_ROLE_KEY:</span>
                      <span className={envResults.environmentCheck?.SUPABASE_SERVICE_ROLE_KEY?.exists ? 'text-green-600' : 'text-red-600'}>
                        {envResults.environmentCheck?.SUPABASE_SERVICE_ROLE_KEY?.exists ? '✅ Present' : '❌ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>DASHBOARD_PASSCODE:</span>
                      <span className={envResults.environmentCheck?.DASHBOARD_PASSCODE?.exists ? 'text-green-600' : 'text-red-600'}>
                        {envResults.environmentCheck?.DASHBOARD_PASSCODE?.exists ? '✅ Present' : '❌ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>NEXT_PUBLIC_SUPABASE_URL:</span>
                      <span className={envResults.environmentCheck?.NEXT_PUBLIC_SUPABASE_URL?.startsCorrectly ? 'text-green-600' : 'text-red-600'}>
                        {envResults.environmentCheck?.NEXT_PUBLIC_SUPABASE_URL?.startsCorrectly ? '✅ Valid' : '❌ Invalid'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Platform Info</h3>
                  <div className="space-y-1 text-sm">
                    <div>Platform: {envResults.deploymentPlatform}</div>
                    <div>Node ENV: {envResults.nodeEnv}</div>
                    <div>Total Env Vars: {envResults.stats?.totalEnvVars}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Results */}
          {authResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🔐 Authentication Status</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Session Status</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Authenticated:</span>
                      <span className={getStatusColor(authResults.summary?.isAuthenticated)}>
                        {getStatusIcon(authResults.summary?.isAuthenticated)} {authResults.summary?.isAuthenticated ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Has Cookie:</span>
                      <span className={authResults.cookieInfo?.hasCookie ? 'text-green-600' : 'text-red-600'}>
                        {authResults.cookieInfo?.hasCookie ? '✅' : '❌'} {authResults.cookieInfo?.hasCookie ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Token Valid:</span>
                      <span className={authResults.sessionInfo?.tokenValid ? 'text-green-600' : 'text-red-600'}>
                        {authResults.sessionInfo?.tokenValid ? '✅' : '❌'} {authResults.sessionInfo?.tokenValid ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Security Utils</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Can Generate Tokens:</span>
                      <span className={authResults.securityTest?.canGenerateSession ? 'text-green-600' : 'text-red-600'}>
                        {authResults.securityTest?.canGenerateSession ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Verify Tokens:</span>
                      <span className={authResults.securityTest?.canVerifySession ? 'text-green-600' : 'text-red-600'}>
                        {authResults.securityTest?.canVerifySession ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {authResults.authenticationTest?.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
                  <h4 className="font-medium text-red-800">Authentication Error:</h4>
                  <p className="text-sm text-red-600">{authResults.authenticationTest.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Database Results */}
          {dbResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🗄️ Database Permissions</h2>
              
              {dbResults.summary?.criticalIssues?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">Database Issues:</h3>
                  {dbResults.summary.criticalIssues.map((issue, index) => (
                    <div key={index} className="text-sm text-red-600">• {issue}</div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Client Setup</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Admin Client:</span>
                      <span className={dbResults.clientTests?.adminClientExists ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.clientTests?.adminClientExists ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Role Key:</span>
                      <span className={dbResults.clientTests?.serviceRoleKeyFormat ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.clientTests?.serviceRoleKeyFormat ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Admin Permissions</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Can Read:</span>
                      <span className={dbResults.adminTests?.canRead ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.adminTests?.canRead ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Insert:</span>
                      <span className={dbResults.adminTests?.canInsert ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.adminTests?.canInsert ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Can Delete:</span>
                      <span className={dbResults.adminTests?.canDelete ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.adminTests?.canDelete ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">File Permissions</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>File Uploads:</span>
                      <span className={dbResults.permissionTests?.canReadFileUploads ? 'text-green-600' : 'text-red-600'}>
                        {dbResults.permissionTests?.canReadFileUploads ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Files found: {dbResults.permissionTests?.fileUploadCount || 0}
                    </div>
                  </div>
                </div>
              </div>

              {(dbResults.adminTests?.readError || dbResults.adminTests?.deleteError) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-4">
                  <h4 className="font-medium text-yellow-800">Database Errors:</h4>
                  {dbResults.adminTests?.readError && (
                    <p className="text-sm text-yellow-600">Read Error: {dbResults.adminTests.readError}</p>
                  )}
                  {dbResults.adminTests?.deleteError && (
                    <p className="text-sm text-yellow-600">Delete Error: {dbResults.adminTests.deleteError}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Webhook Monitor Results */}
          {webhookResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🔌 Webhook Configuration Check</h2>
              
              {webhookResults.summary && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">Webhook Status Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Webhook Configured:</strong> 
                      <span className={webhookResults.summary.webhookConfigured ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookResults.summary.webhookConfigured ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Stripe Keys Valid:</strong> 
                      <span className={webhookResults.summary.stripeKeysValid ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookResults.summary.stripeKeysValid ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Email Configured:</strong> 
                      <span className={webhookResults.summary.emailConfigured ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookResults.summary.emailConfigured ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Production Ready:</strong> 
                      <span className={webhookResults.summary.productionReady ? 'text-green-600 ml-2' : 'text-yellow-600 ml-2'}>
                        {webhookResults.summary.productionReady ? '✅ Yes' : '⚠️ Test Mode'}
                      </span>
                    </div>
                  </div>

                  {webhookResults.summary.potentialIssues?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-800 mb-2">⚠️ Potential Issues:</h4>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {webhookResults.summary.potentialIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {webhookResults.webhook && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border rounded p-4">
                    <h4 className="font-medium mb-2">Webhook Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Secret Format:</span>
                        <span className={webhookResults.webhook.configuration.endpointSecret.format === 'Valid' ? 'text-green-600' : 'text-red-600'}>
                          {webhookResults.webhook.configuration.endpointSecret.format}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Secret Preview:</span>
                        <code className="text-xs bg-gray-100 px-1 rounded">{webhookResults.webhook.configuration.endpointSecret.preview}</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Endpoint:</span>
                        <code className="text-xs bg-gray-100 px-1 rounded break-all">{webhookResults.webhook.webhookEndpoint.expectedUrl}</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border rounded p-4">
                    <h4 className="font-medium mb-2">Stripe Keys</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Secret Key:</span>
                        <span className={webhookResults.webhook.configuration.stripeKeys.secretKey.includes('Test') ? 'text-yellow-600' : 'text-green-600'}>
                          {webhookResults.webhook.configuration.stripeKeys.secretKey}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Publishable Key:</span>
                        <span className={webhookResults.webhook.configuration.stripeKeys.publishableKey.includes('Test') ? 'text-yellow-600' : 'text-green-600'}>
                          {webhookResults.webhook.configuration.stripeKeys.publishableKey}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Environment:</span>
                        <span className={webhookResults.webhook.environment.isProduction ? 'text-green-600' : 'text-yellow-600'}>
                          {webhookResults.webhook.environment.isProduction ? 'Production' : 'Development'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Environment Debug Results */}
          {environmentResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🌐 Environment URL Debug</h2>
              
              {environmentResults.summary && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">URL Configuration Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Site URL Configured:</strong> 
                      <span className={environmentResults.summary.siteUrlConfigured ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {environmentResults.summary.siteUrlConfigured ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Using Fallback:</strong> 
                      <span className={environmentResults.summary.usingFallback ? 'text-red-600 ml-2' : 'text-green-600 ml-2'}>
                        {environmentResults.summary.usingFallback ? '⚠️ Yes (BAD)' : '✅ No (GOOD)'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <strong>Resolved URL:</strong> 
                      <code className="bg-gray-100 px-2 py-1 rounded ml-2">{environmentResults.summary.resolvedUrl}</code>
                    </div>
                    <div>
                      <strong>Platform:</strong> 
                      <span className="ml-2">{environmentResults.summary.platform}</span>
                    </div>
                    <div>
                      <strong>Environment:</strong> 
                      <span className="ml-2">{environmentResults.summary.isProduction ? 'Production' : 'Development'}</span>
                    </div>
                  </div>
                </div>
              )}

              {environmentResults.environment?.siteUrlConfig && (
                <div className="bg-gray-50 border rounded p-4">
                  <h4 className="font-medium mb-2">Site URL Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Environment Variable Set:</span>
                      <span className={environmentResults.environment.siteUrlConfig.exists ? 'text-green-600' : 'text-red-600'}>
                        {environmentResults.environment.siteUrlConfig.exists ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uses HTTPS:</span>
                      <span className={environmentResults.environment.siteUrlConfig.startsWithHttps ? 'text-green-600' : 'text-red-600'}>
                        {environmentResults.environment.siteUrlConfig.startsWithHttps ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contains MJK Prints Domain:</span>
                      <span className={environmentResults.environment.siteUrlConfig.containsMjkprints ? 'text-green-600' : 'text-red-600'}>
                        {environmentResults.environment.siteUrlConfig.containsMjkprints ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contains Localhost (BAD in prod):</span>
                      <span className={environmentResults.environment.siteUrlConfig.containsLocalhost ? 'text-red-600' : 'text-green-600'}>
                        {environmentResults.environment.siteUrlConfig.containsLocalhost ? '❌ Yes' : '✅ No'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Webhook Test Results */}
          {webhookTestResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">🔌 Webhook Delivery Test</h2>
              
              {webhookTestResults.success ? (
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Webhook Test Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Endpoint Accessible:</strong> 
                      <span className={webhookTestResults.summary?.webhookAccessible ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookTestResults.summary?.webhookAccessible ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Configuration Valid:</strong> 
                      <span className={webhookTestResults.summary?.configurationValid ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookTestResults.summary?.configurationValid ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                    <div>
                      <strong>Database Connected:</strong> 
                      <span className={webhookTestResults.summary?.databaseConnected ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                        {webhookTestResults.summary?.databaseConnected ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <strong>Ready for Webhooks:</strong> 
                    <span className={webhookTestResults.summary?.readyForWebhooks ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                      {webhookTestResults.summary?.readyForWebhooks ? '✅ System Ready' : '❌ Issues Found'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Webhook Test Failed</h3>
                  <p className="text-sm text-red-700">{webhookTestResults.error}</p>
                </div>
              )}

              {webhookTestResults.recommendations?.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">🔧 Recommendations:</h4>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {webhookTestResults.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Email Test Results */}
          {emailResults && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">📧 Email Test Results</h2>
              
              {emailResults.success ? (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Email Sent Successfully!</h3>
                  <div className="text-sm text-green-700">
                    <p><strong>Type:</strong> {emailResults.details?.type}</p>
                    <p><strong>Recipient:</strong> {emailResults.details?.recipient}</p>
                    <p><strong>Order ID:</strong> {emailResults.details?.orderId}</p>
                    <p className="mt-2">{emailResults.message}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-4">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Email Test Failed</h3>
                  <div className="text-sm text-red-700">
                    <p><strong>Error:</strong> {emailResults.error}</p>
                    {emailResults.details && (
                      <p><strong>Details:</strong> {emailResults.details}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw Results (for advanced debugging) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">🔍 Raw Debug Data</h2>
            <div className="space-y-4">
              {envResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Environment Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(envResults, null, 2)}
                  </pre>
                </details>
              )}
              {authResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Authentication Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(authResults, null, 2)}
                  </pre>
                </details>
              )}
              {dbResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Database Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(dbResults, null, 2)}
                  </pre>
                </details>
              )}
              {emailResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Email Test Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(emailResults, null, 2)}
                  </pre>
                </details>
              )}
              {environmentResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Environment URL Debug Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(environmentResults, null, 2)}
                  </pre>
                </details>
              )}
              {webhookResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Webhook Monitor Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(webhookResults, null, 2)}
                  </pre>
                </details>
              )}
              {webhookTestResults && (
                <details className="border rounded p-2">
                  <summary className="cursor-pointer font-medium">Webhook Test Results</summary>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mt-2">
                    {JSON.stringify(webhookTestResults, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </PasscodeProtection>
  )
}