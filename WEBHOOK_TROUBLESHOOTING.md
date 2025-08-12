# Stripe Webhook Troubleshooting Guide

This guide helps diagnose and fix common webhook issues in the MJK Prints payment system.

## Quick Diagnosis

Run the automated troubleshooting tools:

```bash
# Test webhook endpoint health
npm run webhook:test

# Check webhook status and configuration
npm run webhook:status

# Test webhook event delivery
npm run webhook:simulate checkout
```

## Common Issues and Solutions

### 1. "Webhook secret not configured"

**Error Message:**
```
Missing STRIPE_WEBHOOK_SECRET environment variable
```

**Cause:** The webhook secret environment variable is missing.

**Solutions:**

**For Development:**
```bash
# Start webhook forwarding
npm run webhook:dev
# or
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook secret from CLI output (whsec_...)
# Add to .env.local:
echo "STRIPE_WEBHOOK_SECRET=whsec_your_secret_here" >> .env.local
```

**For Production:**
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click on your webhook endpoint
3. In "Signing secret" section, click "Reveal"
4. Copy the secret and add to your production environment variables

### 2. "Invalid webhook signature"

**Error Message:**
```
Webhook signature verification failed
Invalid webhook signature
```

**Cause:** The webhook secret doesn't match or the request body has been modified.

**Solutions:**

1. **Verify webhook secret matches:**
   ```bash
   # Check your current secret in .env.local
   grep STRIPE_WEBHOOK_SECRET .env.local
   
   # Compare with Stripe CLI output
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

2. **Check body parsing configuration:**
   Ensure `/pages/api/webhooks/stripe.js` has:
   ```javascript
   export const config = {
     api: {
       bodyParser: false,
     },
   }
   ```

3. **Verify no middleware is modifying requests:**
   - Check for custom middleware in `_app.js`
   - Ensure no proxy/load balancer is modifying request bodies

4. **Test with curl:**
   ```bash
   # This should fail with signature error (expected)
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "stripe-signature: invalid" \
     -d '{"test": "data"}'
   ```

### 3. "Failed to connect to localhost"

**Error Message:**
```
Failed to connect to localhost:3000
ECONNREFUSED
```

**Cause:** Development server is not running or wrong port.

**Solutions:**

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Check if port 3000 is in use:**
   ```bash
   lsof -ti:3000
   # If something is running, kill it or use different port
   npm run dev -- -p 3001
   ```

3. **Update webhook forwarding port:**
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

4. **Check firewall settings:**
   - Ensure localhost connections are allowed
   - Disable VPN if causing connectivity issues

### 4. "Webhook events not received"

**Symptoms:**
- Stripe CLI shows events sent but webhook handler not triggered
- No logs in development server console

**Solutions:**

1. **Verify webhook forwarding is active:**
   ```bash
   stripe listen --list
   # Should show active forwarding to localhost:3000
   ```

2. **Check webhook endpoint URL:**
   - Development: `http://localhost:3000/api/webhooks/stripe`
   - Production: `https://yourdomain.com/api/webhooks/stripe`

3. **Verify events are configured in Stripe Dashboard:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

4. **Test endpoint directly:**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "Content-Type: application/json" \
     -d '{"test": "direct"}'
   ```

5. **Check webhook endpoint logs:**
   ```bash
   # In your development server output, look for:
   # "Received Stripe webhook: [event_type]"
   ```

### 5. "Order not found" or Database Errors

**Error Message:**
```
Error processing checkout session completion
No order_id found in session metadata
```

**Cause:** Order creation failed or metadata not passed correctly.

**Solutions:**

1. **Check order creation process:**
   ```bash
   # Verify database schema is deployed
   npm run verify:database
   
   # Check recent orders in database
   # (via Supabase dashboard or database client)
   ```

2. **Verify checkout session metadata:**
   ```javascript
   // In your checkout session creation (/api/checkout/session.js)
   const session = await stripe.checkout.sessions.create({
     // ... other config
     metadata: {
       order_id: orderId,    // Must be present
       email: email,         // Should be present
     },
   })
   ```

3. **Check order status flow:**
   - Order created as 'pending' during checkout
   - Order updated to 'completed' in webhook
   - Download links created after completion

4. **Test order creation manually:**
   ```bash
   curl -X POST http://localhost:3000/api/orders \
     -H "Content-Type: application/json" \
     -d '{"items": [{"id": "test", "quantity": 1}], "email": "test@example.com"}'
   ```

### 6. "Email delivery failed"

**Error Message:**
```
Failed to send confirmation email
SendGrid API error
```

**Cause:** SendGrid configuration issues or email service problems.

**Solutions:**

1. **Check SendGrid configuration:**
   ```bash
   # Verify environment variables
   grep SENDGRID .env.local
   
   # Should have:
   # SENDGRID_API_KEY=SG.xxx
   # SENDGRID_FROM_EMAIL=your-verified-email@domain.com
   ```

2. **Verify sender email is verified in SendGrid:**
   - Go to SendGrid > Settings > Sender Authentication
   - Ensure sender email is verified

3. **Test email function directly:**
   ```javascript
   // In your development console or test script
   import { sendOrderConfirmationEmail } from '../lib/email'
   
   const testOrder = {
     id: 'test_order',
     customer_email: 'test@example.com',
     total: 29.99
   }
   
   const result = await sendOrderConfirmationEmail(testOrder, [])
   console.log(result)
   ```

4. **Check SendGrid activity logs:**
   - Go to SendGrid Dashboard > Activity
   - Look for recent send attempts and errors

5. **Test with minimal email:**
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations": [{"to": [{"email": "test@example.com"}]}], "from": {"email": "your-verified-email@domain.com"}, "subject": "Test", "content": [{"type": "text/plain", "value": "Test"}]}'
   ```

### 7. "Webhook timeout" or Slow Processing

**Symptoms:**
- Webhook processing takes > 10 seconds
- Stripe retries webhook delivery
- Inconsistent order processing

**Solutions:**

1. **Optimize webhook handler:**
   ```javascript
   // Keep processing fast and simple
   export default async function handler(req, res) {
     // ... signature verification
     
     // Return 200 quickly
     res.status(200).json({ received: true })
     
     // Process in background if needed
     setImmediate(() => processWebhookEvent(event))
   }
   ```

2. **Add webhook processing timeouts:**
   ```javascript
   const processWithTimeout = (promise, timeout = 10000) => {
     return Promise.race([
       promise,
       new Promise((_, reject) => 
         setTimeout(() => reject(new Error('Timeout')), timeout)
       )
     ])
   }
   ```

3. **Optimize database queries:**
   - Use indexes on frequently queried fields
   - Minimize database roundtrips
   - Use connection pooling

4. **Monitor processing time:**
   ```javascript
   const startTime = Date.now()
   // ... processing
   const duration = Date.now() - startTime
   console.log(`Webhook processed in ${duration}ms`)
   ```

### 8. "Duplicate webhook processing"

**Symptoms:**
- Multiple confirmation emails sent
- Duplicate download links created
- Order processed multiple times

**Cause:** Webhook retry mechanism or missing idempotency.

**Solutions:**

1. **Implement idempotency:**
   ```javascript
   const processedEvents = new Set()
   
   export default async function handler(req, res) {
     const event = verifyWebhookSignature(buf, signature, endpointSecret)
     
     // Check if already processed
     if (processedEvents.has(event.id)) {
       return res.status(200).json({ received: true })
     }
     
     // Process event
     await processEvent(event)
     
     // Mark as processed
     processedEvents.add(event.id)
     
     res.status(200).json({ received: true })
   }
   ```

2. **Use database to track processed events:**
   ```sql
   CREATE TABLE processed_webhook_events (
     event_id VARCHAR PRIMARY KEY,
     processed_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Check Stripe event timestamps:**
   ```javascript
   const eventAge = Date.now() / 1000 - event.created
   if (eventAge > 300) { // Older than 5 minutes
     console.warn('Processing old event:', event.id)
   }
   ```

## Advanced Debugging

### Enable Debug Logging

Add debug logging to your webhook handler:

```javascript
// pages/api/webhooks/stripe.js
const DEBUG = process.env.NODE_ENV === 'development'

function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[WEBHOOK DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
}

export default async function handler(req, res) {
  debugLog('Webhook received', {
    method: req.method,
    headers: req.headers,
    url: req.url
  })
  
  // ... rest of handler
}
```

### Test Individual Components

```bash
# Test database connection
node -e "
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
supabase.from('orders').select('*').limit(1).then(console.log)
"

# Test Stripe API
node -e "
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
stripe.events.list({ limit: 1 }).then(console.log)
"

# Test email sending
node -e "
import { sendOrderConfirmationEmail } from './lib/email.js'
const testOrder = { id: 'test', customer_email: 'test@example.com', total: 29.99 }
sendOrderConfirmationEmail(testOrder, []).then(console.log)
"
```

### Monitor Production Webhooks

1. **Stripe Dashboard Monitoring:**
   - Go to Webhooks > Your endpoint
   - Check "Recent events" for delivery status
   - Review failed attempts and error messages

2. **Application Monitoring:**
   ```javascript
   // Add to your webhook handler
   const webhookMetrics = {
     received: 0,
     processed: 0,
     errors: 0
   }
   
   // Log metrics periodically
   setInterval(() => {
     console.log('Webhook metrics:', webhookMetrics)
   }, 60000) // Every minute
   ```

3. **Health Check Endpoint:**
   ```javascript
   // pages/api/health/webhooks.js
   export default function handler(req, res) {
     res.status(200).json({
       webhook_endpoint: '/api/webhooks/stripe',
       last_processed: process.env.LAST_WEBHOOK_PROCESSED || 'never',
       status: 'healthy'
     })
   }
   ```

## Performance Optimization

### Webhook Response Time

Aim for < 5 seconds response time:

```javascript
export default async function handler(req, res) {
  const startTime = Date.now()
  
  try {
    // Quick validation
    const event = verifyWebhookSignature(buf, signature, endpointSecret)
    
    // Respond quickly
    res.status(200).json({ received: true })
    
    // Process asynchronously
    setImmediate(async () => {
      try {
        await processWebhookEvent(event)
        const duration = Date.now() - startTime
        console.log(`Webhook processed in ${duration}ms`)
      } catch (error) {
        console.error('Background processing error:', error)
      }
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`Webhook failed in ${duration}ms:`, error)
    res.status(400).json({ error: 'Webhook processing failed' })
  }
}
```

### Database Optimization

```sql
-- Add indexes for webhook processing
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_downloads_email ON downloads(email);
```

## Security Considerations

### Webhook Security Checklist

- [ ] Always verify webhook signatures
- [ ] Use HTTPS in production
- [ ] Validate event data before processing
- [ ] Implement rate limiting
- [ ] Log suspicious activity
- [ ] Use different webhook secrets for dev/prod
- [ ] Regularly rotate webhook secrets

### Example Security Implementation

```javascript
const rateLimiter = new Map()

export default async function handler(req, res) {
  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  const now = Date.now()
  const windowStart = now - 60000 // 1 minute window
  
  if (!rateLimiter.has(clientIP)) {
    rateLimiter.set(clientIP, [])
  }
  
  const requests = rateLimiter.get(clientIP).filter(time => time > windowStart)
  
  if (requests.length >= 100) { // Max 100 requests per minute
    return res.status(429).json({ error: 'Rate limited' })
  }
  
  requests.push(now)
  rateLimiter.set(clientIP, requests)
  
  // ... rest of handler
}
```

## Getting Help

### Debug Information to Collect

When asking for help, include:

1. **Error messages** (full stack trace)
2. **Webhook event ID** from Stripe Dashboard
3. **Environment configuration** (without secrets)
4. **Recent application logs**
5. **Stripe CLI output**
6. **Browser network tab** (for checkout issues)

### Support Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [MJK Prints Setup Guide](STRIPE_WEBHOOKS_GUIDE.md)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- Test webhook processing: `npm run webhook:test`
- Monitor webhook status: `npm run webhook:status`

### Emergency Troubleshooting

If webhooks are completely broken in production:

1. **Disable webhook processing temporarily:**
   ```javascript
   // Quick fix in webhook handler
   export default async function handler(req, res) {
     console.log('Webhook disabled for maintenance')
     res.status(200).json({ received: true })
   }
   ```

2. **Process orders manually:**
   ```bash
   # Create script to process pending orders
   npm run process:pending-orders
   ```

3. **Check Stripe Dashboard** for failed webhook deliveries and manually trigger them

4. **Verify environment variables** are correctly set in production

This troubleshooting guide covers the most common webhook issues. For specific problems not covered here, use the debug tools and collect the information listed above before seeking help.