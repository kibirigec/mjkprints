import { performSystemHealthCheck } from '../../../lib/supabase'

// System health check endpoint for debugging and monitoring
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[HEALTH-API] System health check requested')
    const healthStatus = await performSystemHealthCheck()
    
    // Set appropriate HTTP status based on health
    let statusCode = 200
    if (healthStatus.overall === 'unhealthy' || healthStatus.overall === 'error') {
      statusCode = 503 // Service Unavailable
    } else if (healthStatus.overall === 'degraded') {
      statusCode = 200 // OK but with warnings
    }
    
    res.status(statusCode).json({
      status: healthStatus.overall,
      timestamp: healthStatus.timestamp,
      checks: {
        environment: healthStatus.environment,
        database: healthStatus.database,
        storage: healthStatus.storage
      },
      ...(healthStatus.error && { error: healthStatus.error })
    })
  } catch (error) {
    console.error('[HEALTH-API] Health check endpoint failed', { error: error.message })
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
}