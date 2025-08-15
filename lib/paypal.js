// PayPal SDK Integration for MJK Prints
import axios from 'axios'

// Validate PayPal configuration
const paypalClientId = process.env.PAYPAL_CLIENT_ID
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET
const paypalEnvironment = process.env.PAYPAL_ENVIRONMENT || 'sandbox' // 'sandbox' or 'live'

// PayPal API Base URLs
const PAYPAL_API_BASE = {
  sandbox: 'https://api.sandbox.paypal.com',
  live: 'https://api.paypal.com'
}

// Check if PayPal is configured
const isPayPalConfigured = paypalClientId && paypalClientSecret

if (!paypalClientId) {
  console.warn('⚠️  PAYPAL_CLIENT_ID environment variable is not set. Payment functionality will be disabled.')
}

if (!paypalClientSecret) {
  console.warn('⚠️  PAYPAL_CLIENT_SECRET environment variable is not set. Payment functionality will be disabled.')
}

// Helper function to check if PayPal is available
export const isPayPalAvailable = () => {
  return isPayPalConfigured
}

// Get PayPal access token
const getPayPalAccessToken = async () => {
  if (!isPayPalAvailable()) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.')
  }

  const baseURL = PAYPAL_API_BASE[paypalEnvironment]
  const auth = Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')

  try {
    const response = await axios.post(
      `${baseURL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    return response.data.access_token
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response?.data || error.message)
    throw new Error('Failed to get PayPal access token')
  }
}

// Create a PayPal order
export const createPayPalOrder = async (orderData) => {
  if (!isPayPalAvailable()) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.')
  }

  const { items, email, successUrl, cancelUrl, orderId } = orderData
  const accessToken = await getPayPalAccessToken()
  const baseURL = PAYPAL_API_BASE[paypalEnvironment]

  // Convert cart items to PayPal purchase units
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const purchaseUnits = [{
    reference_id: orderId.toString(),
    amount: {
      currency_code: 'USD',
      value: total.toFixed(2)
    },
    description: `MJK Prints Digital Downloads (${items.length} item${items.length > 1 ? 's' : ''})`
  }]

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: purchaseUnits,
    application_context: {
      brand_name: 'MJK Prints',
      locale: 'en-US',
      landing_page: 'NO_PREFERENCE', 
      user_action: 'PAY_NOW',
      return_url: successUrl,
      cancel_url: cancelUrl
    }
  }

  try {
    const response = await axios.post(
      `${baseURL}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error creating PayPal order:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      payloadSent: orderPayload
    })
    throw new Error(`Failed to create PayPal order: ${error.response?.data?.message || error.message}`)
  }
}

// Capture PayPal order payment
export const capturePayPalOrder = async (orderId) => {
  if (!isPayPalAvailable()) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.')
  }

  const accessToken = await getPayPalAccessToken()
  const baseURL = PAYPAL_API_BASE[paypalEnvironment]

  try {
    const response = await axios.post(
      `${baseURL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error capturing PayPal order:', error.response?.data || error.message)
    throw new Error('Failed to capture PayPal payment')
  }
}

// Get PayPal order details
export const getPayPalOrderDetails = async (orderId) => {
  if (!isPayPalAvailable()) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.')
  }

  const accessToken = await getPayPalAccessToken()
  const baseURL = PAYPAL_API_BASE[paypalEnvironment]

  try {
    const response = await axios.get(
      `${baseURL}/v2/checkout/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data
  } catch (error) {
    console.error('Error getting PayPal order details:', error.response?.data || error.message)
    throw new Error('Failed to get PayPal order details')
  }
}

// Verify PayPal webhook signature
export const verifyPayPalWebhookSignature = async (payload, headers) => {
  if (!isPayPalAvailable()) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.')
  }

  const accessToken = await getPayPalAccessToken()
  const baseURL = PAYPAL_API_BASE[paypalEnvironment]
  const webhookId = process.env.PAYPAL_WEBHOOK_ID

  if (!webhookId) {
    throw new Error('PAYPAL_WEBHOOK_ID is not configured')
  }

  const verificationPayload = {
    auth_algo: headers['paypal-auth-algo'],
    cert_id: headers['paypal-cert-id'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: webhookId,
    webhook_event: JSON.parse(payload)
  }

  try {
    const response = await axios.post(
      `${baseURL}/v1/notifications/verify-webhook-signature`,
      verificationPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return response.data.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('Error verifying PayPal webhook signature:', error.response?.data || error.message)
    return false
  }
}

// Create a PayPal customer (for future subscriptions if needed)
export const createPayPalCustomer = async (customerData) => {
  // PayPal doesn't have a direct customer creation API like Stripe
  // This function is for future compatibility
  console.log('PayPal customer creation not implemented yet:', customerData.email)
  return { email: customerData.email, source: 'paypal' }
}