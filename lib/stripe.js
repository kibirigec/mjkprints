import Stripe from 'stripe'

// Validate Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Check if Stripe is configured
const isStripeConfigured = stripeSecretKey && stripeSecretKey.startsWith('sk_')

if (!stripeSecretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY environment variable is not set. Payment functionality will be disabled.')
}

if (stripeSecretKey && !stripeSecretKey.startsWith('sk_')) {
  console.error('❌ Invalid Stripe secret key format. Key should start with "sk_"')
}

// Initialize Stripe on the server side (only if properly configured)
export const stripe = isStripeConfigured ? new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
}) : null

// Helper function to check if Stripe is available
export const isStripeAvailable = () => {
  return stripe !== null
}

// Create a Stripe checkout session
export const createCheckoutSession = async (orderData) => {
  if (!isStripeAvailable()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }

  const { items, email, successUrl, cancelUrl, orderId } = orderData

  // Convert cart items to Stripe line items
  const lineItems = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.title,
        description: item.description,
        images: [item.image],
        metadata: {
          product_id: item.id,
          digital_product: 'true'
        }
      },
      unit_amount: Math.round(item.price * 100), // Stripe expects cents
    },
    quantity: item.quantity,
  }))

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        order_id: orderId,
        email: email,
      },
      automatic_tax: {
        enabled: false,
      },
      billing_address_collection: 'auto',
      shipping_address_collection: null, // No shipping for digital products
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    })

    return session
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

// Create a Stripe customer
export const createStripeCustomer = async (customerData) => {
  if (!isStripeAvailable()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }

  try {
    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      metadata: {
        source: 'mjk_prints'
      }
    })

    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw new Error('Failed to create customer')
  }
}

// Verify webhook signature
export const verifyWebhookSignature = (payload, signature, endpointSecret) => {
  if (!isStripeAvailable()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    throw new Error('Invalid webhook signature')
  }
}

// Get payment intent details
export const getPaymentIntent = async (paymentIntentId) => {
  if (!isStripeAvailable()) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
  }

  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error) {
    console.error('Error retrieving payment intent:', error)
    throw new Error('Failed to retrieve payment intent')
  }
}