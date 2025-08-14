# Production Webhook Setup Guide

This guide walks through setting up Stripe webhooks for production deployment on Netlify.

## 🚨 Critical Issue Identified

**The email delivery failure is likely due to missing production webhook configuration in Stripe Dashboard.**

## Current Status

✅ **Checkout URLs Fixed** - Production checkout now redirects to correct domain  
❌ **Email Delivery Missing** - Requires webhook setup to trigger email sending  
✅ **Debug Tools Added** - Comprehensive webhook monitoring available  

## Production Webhook Setup Steps

### 1. Access Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > Webhooks**
3. Look for existing webhooks

### 2. Create Production Webhook Endpoint

If no production webhook exists:

1. Click **"Add endpoint"**
2. Set **Endpoint URL**: `https://mjkprints.store/api/webhooks/stripe`
3. Select **Events to send**:
   - `checkout.session.completed` ✅ (Critical for email delivery)
   - `payment_intent.succeeded` ✅ (Optional)
   - `payment_intent.payment_failed` ✅ (Optional)

### 3. Get Webhook Secret

After creating the webhook:
1. Click on the new webhook endpoint
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### 4. Update Netlify Environment Variables

In Netlify Dashboard > Site Settings > Environment Variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_production_secret_here
```

**Important**: This must be different from your development webhook secret!

### 5. Deploy and Test

1. Trigger a new Netlify deployment (or redeploy)
2. Use the debug tools to verify configuration
3. Test a real purchase to confirm email delivery

## Debug Tools Usage

### Webhook Configuration Check

1. Go to `https://mjkprints.store/debug-production`
2. Click **"🔌 Webhook Check"** button
3. Review webhook configuration status

### Webhook Delivery Test

1. Click **"🔌 Test Webhook Delivery"** button
2. This tests endpoint accessibility and configuration
3. Check recommendations for any issues

### Environment Debug

1. Click **"🌐 URL Debug"** button  
2. Verify all environment variables are loaded correctly
3. Confirm production environment detection

## Common Issues & Solutions

### Issue: "Webhook not configured"
**Solution**: Create webhook endpoint in Stripe Dashboard (Step 2 above)

### Issue: "Invalid webhook signature" 
**Solution**: Update `STRIPE_WEBHOOK_SECRET` in Netlify environment variables

### Issue: "Webhook endpoint not accessible"
**Solution**: Verify webhook URL matches deployed site URL exactly

### Issue: "Environment variable not set"
**Solution**: Check Netlify environment variables and redeploy

## Webhook Flow Explanation

```
User completes checkout 
    ↓
Stripe processes payment
    ↓  
Stripe sends webhook to: https://mjkprints.store/api/webhooks/stripe
    ↓
Webhook handler processes event:
  - Updates order status to "completed"
  - Creates download links  
  - Sends confirmation email
    ↓
User receives email with files/download links
```

## Testing Production Webhooks

### Test with Stripe CLI (Optional)

```bash
# Forward production webhooks to local for testing
stripe listen --forward-to https://mjkprints.store/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

### Test with Real Purchase

1. Make a test purchase on production site
2. Check Netlify function logs for webhook processing
3. Verify email delivery
4. Check Stripe Dashboard > Webhooks for delivery status

## Monitoring & Debugging

### Netlify Function Logs

1. Netlify Dashboard > Functions
2. Look for `/api/webhooks/stripe` function
3. Check execution logs for errors

### Stripe Webhook Logs

1. Stripe Dashboard > Webhooks  
2. Click on your webhook endpoint
3. Review "Recent deliveries" for success/failure status

## Environment Variables Checklist

Required for production email delivery:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... (or sk_test_ for testing)
STRIPE_WEBHOOK_SECRET=whsec_your_production_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_)

# Site Configuration  
NEXT_PUBLIC_SITE_URL=https://mjkprints.store

# Email Configuration
MAILERSEND_API_KEY=mlsn.your_api_key
MAILERSEND_FROM_EMAIL=noreply@mjkprints.store

# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Next Steps

1. **Immediate**: Set up production webhook in Stripe Dashboard
2. **Verify**: Use debug tools to confirm configuration  
3. **Test**: Make a test purchase to verify email delivery
4. **Monitor**: Check webhook delivery logs in Stripe Dashboard

The debug tools on the production site will help identify exactly what's missing or misconfigured.