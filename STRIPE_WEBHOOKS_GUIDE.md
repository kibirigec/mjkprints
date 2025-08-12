# Stripe Webhook Testing Guide for MJK Prints

This comprehensive guide covers setting up, testing, and troubleshooting Stripe webhooks for the MJK Prints payment system.

## Overview

The MJK Prints webhook endpoint (`/api/webhooks/stripe`) handles these critical payment events:
- `checkout.session.completed` - Main order processing trigger
- `payment_intent.succeeded` - Payment confirmation
- `payment_intent.payment_failed` - Failed payment handling

## Quick Start

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (macOS)
2. Login to Stripe: `stripe login`
3. Start webhook forwarding: `npm run webhook:dev`
4. Test payments with your application

## Development Setup

### 1. Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

**Windows:**
Download from [Stripe CLI releases](https://github.com/stripe/stripe-cli/releases)

### 2. Authenticate with Stripe

```bash
stripe login
```

This opens a browser to authorize the CLI with your Stripe account.

### 3. Forward Webhooks to Local Development

```bash
# Start webhook forwarding (added to package.json as npm script)
npm run webhook:dev

# Or run directly:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI will output your webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef... (^C to quit)
```

### 4. Update Environment Variables

Add the webhook secret to your `.env.local`:
```bash
# Development webhook secret from Stripe CLI
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

## Production Setup

### 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to send:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click "Add endpoint"

### 2. Copy Webhook Signing Secret

1. Click on your newly created webhook endpoint
2. In the "Signing secret" section, click "Reveal"
3. Copy the secret (starts with `whsec_`)

### 3. Update Production Environment Variables

Set in your production environment:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_production_secret_here
```

## Testing Webhooks

### Automated Testing

Use the provided testing scripts:

```bash
# Test webhook endpoint availability
npm run webhook:test

# Simulate webhook events
npm run webhook:simulate

# Monitor webhook status
npm run webhook:status
```

### Manual Testing with Stripe CLI

```bash
# Trigger a specific event
stripe trigger checkout.session.completed

# Trigger payment success
stripe trigger payment_intent.succeeded

# Trigger payment failure
stripe trigger payment_intent.payment_failed

# List recent events
stripe events list
```

### Testing Full Payment Flow

1. Start your development server: `npm run dev`
2. Start webhook forwarding: `npm run webhook:dev`
3. Go to your local store: `http://localhost:3000`
4. Add products to cart and proceed to checkout
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete the purchase and verify webhook processing

## Stripe Test Cards

Use these test cards for different scenarios:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |
| `4000 0000 0000 9979` | Stolen card |

Use any future expiry date, any 3-digit CVC, and any ZIP code.

## Webhook Event Flow

### 1. Checkout Session Completed
```
Customer completes payment
↓
Stripe sends checkout.session.completed
↓
Webhook processes order:
  - Updates order status to 'completed'
  - Creates download links
  - Sends confirmation email
```

### 2. Payment Intent Succeeded
```
Payment processes successfully
↓
Stripe sends payment_intent.succeeded
↓
Webhook logs success (additional processing optional)
```

### 3. Payment Intent Failed
```
Payment fails
↓
Stripe sends payment_intent.payment_failed
↓
Webhook logs failure and can trigger retry logic
```

## Monitoring and Logging

### Webhook Logs

Monitor webhook processing in development:
```bash
# View application logs
npm run dev

# View Stripe CLI logs
stripe listen --forward-to localhost:3000/api/webhooks/stripe --log-level debug
```

### Production Monitoring

Check webhook delivery in Stripe Dashboard:
1. Go to Webhooks section
2. Click on your endpoint
3. View "Recent events" tab
4. Check for failed deliveries (red status)

## Environment Configuration

### Required Environment Variables

```bash
# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Different for dev/prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # or https://yourdomain.com

# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email (Optional - graceful degradation)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Environment Validation

The application validates environment variables on startup:
- Stripe keys must have correct prefixes (`sk_`, `pk_`, `whsec_`)
- Missing variables trigger warnings but don't crash the app
- Webhook secret is required for webhook processing

## Troubleshooting

### Common Issues

#### 1. "Webhook secret not configured"
**Problem:** `STRIPE_WEBHOOK_SECRET` environment variable missing
**Solution:** 
- Development: Run `stripe listen` and copy the displayed secret
- Production: Get secret from Stripe Dashboard webhook settings

#### 2. "Invalid webhook signature" 
**Problem:** Signature verification failing
**Solutions:**
- Ensure webhook secret matches endpoint configuration
- Check that webhook URL in Stripe Dashboard is correct
- Verify no middleware is modifying request body
- Confirm `bodyParser: false` in webhook API route config

#### 3. Webhook events not received
**Problem:** Stripe not sending webhooks to your endpoint
**Solutions:**
- Verify webhook endpoint URL is publicly accessible
- Check webhook events are configured in Stripe Dashboard
- Ensure firewall/security groups allow Stripe webhook IPs
- Test with ngrok if running locally

#### 4. "Failed to connect to localhost"
**Problem:** Stripe CLI can't reach your development server
**Solutions:**
- Ensure development server is running on port 3000
- Check no other service is using port 3000
- Try different port: `next dev -p 3001` and update webhook URL

#### 5. Database/email errors in webhook processing
**Problem:** Webhook receives event but processing fails
**Solutions:**
- Check database connection and table schema
- Verify email service configuration
- Review application logs for specific error messages
- Ensure order exists before processing completion

### Debug Commands

```bash
# Check Stripe CLI connection
stripe listen --list

# Test webhook endpoint directly
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# View webhook event details
stripe events retrieve evt_1234567890

# Test with specific event data
stripe events resend evt_1234567890
```

### Production Debugging

1. **Check Stripe Dashboard:**
   - Webhook delivery attempts and responses
   - HTTP status codes and response times
   - Event payload and metadata

2. **Application Logs:**
   - Server logs for webhook processing
   - Database operation results
   - Email delivery status

3. **Database Verification:**
   - Check order status updates
   - Verify download link creation
   - Confirm customer records

## Security Considerations

### Webhook Security Best Practices

1. **Always verify webhook signatures:**
   ```javascript
   const event = verifyWebhookSignature(buf, signature, endpointSecret)
   ```

2. **Use environment variables for secrets:**
   - Never hardcode webhook secrets
   - Use different secrets for development/production

3. **Implement idempotency:**
   - Handle duplicate webhook deliveries gracefully
   - Use event IDs to prevent double processing

4. **Validate event data:**
   - Check required fields exist before processing
   - Validate amounts and product information

5. **Secure endpoint access:**
   - Only accept POST requests
   - Implement rate limiting for production
   - Log suspicious activity

### Testing Security

```bash
# Test invalid signature (should fail)
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "stripe-signature: invalid" \
  -d '{"test": "data"}'

# Test missing signature (should fail)  
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -d '{"test": "data"}'
```

## Performance Optimization

### Webhook Performance Tips

1. **Keep processing fast:**
   - Aim for <5 second response time
   - Use async processing for heavy operations
   - Return 200 status quickly, process in background if needed

2. **Handle failures gracefully:**
   - Log errors but don't crash
   - Return appropriate HTTP status codes
   - Implement retry logic for transient failures

3. **Optimize database queries:**
   - Use indexes on frequently queried fields
   - Minimize database operations in webhook handler
   - Consider connection pooling

## Advanced Configuration

### Custom Webhook Events

Add handling for additional Stripe events:

```javascript
// In /pages/api/webhooks/stripe.js
case 'customer.created':
  await handleCustomerCreated(event.data.object)
  break

case 'invoice.payment_failed':
  await handleInvoicePaymentFailed(event.data.object)  
  break
```

### Webhook Retries

Stripe automatically retries failed webhooks:
- Initial attempt
- Retries after 1 hour, 8 hours, 24 hours
- Final retry after 72 hours
- Webhook disabled after consecutive failures

Configure retry behavior in your webhook handler:
```javascript
// Return appropriate status codes
res.status(200).json({ received: true }) // Success
res.status(400).json({ error: 'Bad request' }) // Don't retry  
res.status(500).json({ error: 'Server error' }) // Will retry
```

## Integration Testing

### End-to-End Testing

Create test scenarios covering the complete payment flow:

1. **Successful Purchase Flow:**
   - Add products to cart
   - Complete checkout with test card
   - Verify webhook processing
   - Check order creation and email delivery

2. **Failed Payment Flow:**
   - Use declined test card
   - Verify failure handling
   - Check order status remains pending

3. **Webhook Failure Recovery:**
   - Simulate webhook processing errors
   - Test retry mechanisms
   - Verify data consistency

### Automated Testing

Consider adding automated webhook tests to your test suite:

```javascript
// Example test structure
describe('Stripe Webhooks', () => {
  test('processes checkout.session.completed', async () => {
    // Mock Stripe event
    // Send to webhook endpoint  
    // Verify order processing
    // Check email delivery
  })
})
```

This guide provides comprehensive coverage of Stripe webhook setup and testing for MJK Prints. Follow the development setup first, then move to production configuration once testing is complete.