# MJK Prints - Stripe Webhook Testing Setup

This directory contains a complete Stripe webhook testing system for the MJK Prints payment integration. Everything you need to set up, test, and troubleshoot Stripe webhooks in both development and production environments.

## 🚀 Quick Start

```bash
# 1. Set up webhooks (guided setup)
npm run webhook:setup

# 2. Test webhook endpoint
npm run webhook:test

# 3. Start webhook forwarding for development
npm run webhook:dev

# 4. Simulate webhook events
npm run webhook:simulate checkout

# 5. Monitor webhook status
npm run webhook:status
```

## 📁 Files Created

### Documentation
- **`STRIPE_WEBHOOKS_GUIDE.md`** - Complete webhook setup and testing guide
- **`WEBHOOK_TROUBLESHOOTING.md`** - Troubleshooting guide for common issues
- **`WEBHOOK_SETUP_README.md`** - This file, overview of the webhook system

### Scripts (`/scripts/`)
- **`setup-webhooks.js`** - Interactive webhook setup assistant
- **`test-webhook.js`** - Tests webhook endpoint availability and configuration
- **`simulate-webhook-events.js`** - Simulates Stripe webhook events for testing
- **`webhook-status.js`** - Monitors webhook health and recent events

### Package.json Scripts Added
```json
{
  "webhook:dev": "stripe listen --forward-to localhost:3000/api/webhooks/stripe",
  "webhook:test": "node scripts/test-webhook.js",
  "webhook:simulate": "node scripts/simulate-webhook-events.js",
  "webhook:status": "node scripts/webhook-status.js",
  "webhook:setup": "node scripts/setup-webhooks.js"
}
```

## 🛠 Webhook System Features

### Development Testing
- **Automated endpoint testing** - Verifies webhook endpoint is accessible and configured
- **Event simulation** - Triggers test webhook events using Stripe CLI
- **Real-time monitoring** - Tracks webhook health and processing status
- **Environment validation** - Checks all required environment variables

### Production Support
- **Production setup guide** - Step-by-step Stripe Dashboard configuration
- **Health monitoring** - Production webhook status monitoring
- **Error diagnostics** - Detailed troubleshooting for common issues
- **Security validation** - Ensures proper webhook signature verification

### Event Handling
The webhook system handles these critical events:
- `checkout.session.completed` - Processes completed payments
- `payment_intent.succeeded` - Confirms successful payments  
- `payment_intent.payment_failed` - Handles payment failures

## 📋 Environment Variables Required

```bash
# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... # Different for dev/prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_...

# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000 # or production URL

# Database (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Email (Optional - graceful degradation)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## 🧪 Testing Workflow

### 1. Initial Setup
```bash
# Run the setup assistant
npm run webhook:setup

# This will:
# - Check Stripe CLI installation
# - Authenticate with Stripe
# - Set up webhook forwarding
# - Configure environment variables
```

### 2. Test Endpoint Health
```bash
# Test webhook endpoint availability
npm run webhook:test

# Expected output:
# ✅ Webhook endpoint is accessible
# ✅ Environment variables configured
# ✅ Database connection working
```

### 3. Start Development Mode
```bash
# Terminal 1: Start your development server
npm run dev

# Terminal 2: Start webhook forwarding
npm run webhook:dev

# You should see:
# > Ready! Your webhook signing secret is whsec_...
```

### 4. Test Event Processing
```bash
# Simulate a successful checkout
npm run webhook:simulate checkout

# Or simulate specific events:
npm run webhook:simulate success   # payment_intent.succeeded
npm run webhook:simulate failed    # payment_intent.payment_failed
npm run webhook:simulate all       # All events
```

### 5. Monitor Webhook Status
```bash
# Check webhook health and recent events
npm run webhook:status

# Continuous monitoring (press Ctrl+C to stop)
npm run webhook:status monitor
```

## 🔧 Webhook Handler Details

The webhook handler at `/pages/api/webhooks/stripe.js` processes these events:

### Checkout Session Completed
```
1. Extracts order ID from session metadata
2. Updates order status to 'completed'
3. Creates time-limited download links
4. Sends confirmation email with downloads
5. Logs processing status
```

### Payment Intent Succeeded
```
1. Logs successful payment
2. Additional processing can be added here
```

### Payment Intent Failed
```
1. Logs payment failure
2. Can trigger retry logic or customer notification
```

## 🔍 Troubleshooting Quick Reference

### Common Issues

| Issue | Quick Fix |
|-------|-----------|
| "Webhook secret not configured" | Run `npm run webhook:dev` and copy secret |
| "Invalid webhook signature" | Verify secret matches CLI output |
| "Failed to connect to localhost" | Ensure `npm run dev` is running |
| "Webhook events not received" | Check webhook forwarding is active |
| "Order not found" | Verify database schema and order creation |
| "Email delivery failed" | Check SendGrid configuration |

### Debug Commands
```bash
# Test webhook endpoint directly
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# List recent Stripe events
stripe events list

# View specific event details
stripe events retrieve evt_1234567890
```

## 🔒 Security Features

### Built-in Security
- **Signature verification** - All webhooks verified using Stripe signature
- **Environment isolation** - Separate secrets for development/production
- **Rate limiting** - Protection against webhook abuse
- **Data validation** - Validates event data before processing
- **Error handling** - Graceful error handling with proper HTTP status codes

### Security Best Practices
- Never log webhook secrets or sensitive data
- Use HTTPS in production
- Implement idempotency for webhook processing
- Monitor for suspicious webhook activity
- Regularly rotate webhook secrets

## 📈 Monitoring and Analytics

### Development Monitoring
```bash
# Real-time webhook monitoring
npm run webhook:status monitor

# View recent events
stripe events list --limit 10

# Check webhook forwarding status
stripe listen --list
```

### Production Monitoring
- Monitor webhook delivery in Stripe Dashboard
- Set up alerts for failed webhook deliveries
- Track webhook processing times
- Monitor order completion rates

## 🚀 Production Deployment

### Pre-deployment Checklist
- [ ] Production webhook endpoint created in Stripe Dashboard
- [ ] Production webhook secret configured in environment
- [ ] Test webhook endpoint is publicly accessible
- [ ] SSL certificate is valid
- [ ] Database schema deployed
- [ ] Email service configured and tested

### Deployment Steps
1. Create production webhook endpoint at `https://yourdomain.com/api/webhooks/stripe`
2. Configure webhook events in Stripe Dashboard
3. Copy webhook secret to production environment
4. Test webhook delivery with Stripe CLI
5. Monitor webhook processing in production logs

## 📚 Additional Resources

- **Complete Setup Guide**: [STRIPE_WEBHOOKS_GUIDE.md](STRIPE_WEBHOOKS_GUIDE.md)
- **Troubleshooting Guide**: [WEBHOOK_TROUBLESHOOTING.md](WEBHOOK_TROUBLESHOOTING.md)
- **Stripe Documentation**: https://stripe.com/docs/webhooks
- **Stripe CLI Documentation**: https://stripe.com/docs/stripe-cli

## 🆘 Getting Help

If you encounter issues:

1. **Run diagnostic tools**:
   ```bash
   npm run webhook:test
   npm run webhook:status
   ```

2. **Check the troubleshooting guide**: [WEBHOOK_TROUBLESHOOTING.md](WEBHOOK_TROUBLESHOOTING.md)

3. **Collect debug information**:
   - Error messages (full stack trace)
   - Webhook event ID from Stripe Dashboard
   - Environment configuration (without secrets)
   - Application logs
   - Stripe CLI output

4. **Test individual components** using the provided debug scripts

This webhook testing system ensures reliable payment processing for MJK Prints with comprehensive testing, monitoring, and troubleshooting capabilities.