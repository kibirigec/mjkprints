# MailerSend Setup Guide for MJK Prints

This guide will help you configure the MailerSend email service for your MJK Prints digital marketplace.

## 🎯 Overview

MJK Prints uses MailerSend to deliver order confirmation emails with:
- ✅ **PDF file attachments** (direct delivery)
- ✅ **Professional HTML email templates**
- ✅ **Backup download links** (7-day expiration)
- ✅ **Mobile-responsive design**
- ✅ **Automatic webhook integration**

## 📋 Step-by-Step Setup

### 1. Create MailerSend Account

1. Go to [https://www.mailersend.com/](https://www.mailersend.com/)
2. Sign up for a free account (includes 3,000 free emails/month)
3. Verify your email address

### 2. Add and Verify Your Domain

1. **Add Domain**:
   - Go to **Email → Domains** in MailerSend dashboard
   - Click **Add Domain**
   - Enter your domain (e.g., `mjkprints.com`)

2. **Add DNS Records**:
   - Copy the provided DNS records
   - Add them to your domain's DNS settings (via your domain registrar)
   - Required records:
     - SPF record
     - DKIM record  
     - DMARC record (optional but recommended)

3. **Verify Domain**:
   - Wait for DNS propagation (can take up to 24 hours)
   - Click **Verify** in MailerSend dashboard
   - Status should show as "Verified" ✅

### 3. Get Your API Key

1. Go to **Settings → API Tokens** in MailerSend dashboard
2. Click **Create Token**
3. Name it `MJK Prints Production` (or similar)
4. Copy the API key (starts with `mlsn.`)
5. **Save it securely** - you won't see it again!

### 4. Configure Environment Variables

Add these to your production environment (Vercel/Netlify/Railway):

```bash
# MailerSend Configuration
MAILERSEND_API_KEY=mlsn.your_api_key_here
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=MJK Prints
```

**Important:** 
- Replace `yourdomain.com` with your verified domain
- The `FROM_EMAIL` must use your verified domain
- Example: `noreply@mjkprints.com`

### 5. Test the Configuration

1. **Local Testing**:
   ```bash
   # Add environment variables to .env.local
   MAILERSEND_API_KEY=mlsn.your_api_key_here
   MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
   MAILERSEND_FROM_NAME=MJK Prints
   
   # Run the test script
   node test-mailersend.js
   ```

2. **Production Testing**:
   - Make a test purchase with your own email
   - Check that you receive the order confirmation
   - Verify PDF attachments are included
   - Test backup download links work

## 🔧 How Email Delivery Works

### Automatic Email Flow
1. **Customer completes purchase** → Stripe webhook triggered
2. **Webhook processes order** → Creates download links
3. **Files retrieved** → PDFs attached to email
4. **Email sent** → Customer receives confirmation with attachments
5. **Backup links created** → 7-day expiration for re-downloads

### Email Features
- **Professional HTML templates** with your branding
- **PDF file attachments** for immediate access
- **Backup download links** if attachments fail
- **Mobile-responsive design** for all devices
- **Order details** and transaction information

## 📧 Email Template Customization

Email templates are in `/lib/email.js`:

```javascript
// Customize email appearance
const FROM_NAME = 'MJK Prints'  // Your business name
const SITE_NAME = 'MJK Prints'  // Site name in emails

// Email styling uses your brand colors:
// - Primary: #2c3e50 (dark blue)
// - Secondary: #e0bfb8 (warm pink)
// - Accent: #f5f0e6 (light cream)
```

## 🚀 Production Deployment Checklist

- [ ] MailerSend account created and verified
- [ ] Domain added and DNS records configured
- [ ] Domain verification completed (green checkmark)
- [ ] API key generated and securely stored
- [ ] Environment variables added to production platform
- [ ] Test email sent successfully
- [ ] File attachments working correctly
- [ ] Download links functional with 7-day expiration

## 🐛 Troubleshooting

### "Email service not configured"
- Check `MAILERSEND_API_KEY` is set in production environment
- Verify API key starts with `mlsn.`
- Ensure no extra spaces in environment variables

### "Domain not verified"
- Check DNS records are correctly added
- Wait up to 24 hours for DNS propagation
- Use online DNS checker tools to verify records

### "Authentication failed"
- Regenerate API key in MailerSend dashboard
- Update environment variables with new key
- Restart your application

### "Attachments not working"
- Check file size limits (MailerSend has 25MB limit)
- Verify files exist in Supabase storage
- Review webhook logs for file retrieval errors

### Test Email Not Received
- Check MailerSend activity logs in dashboard
- Verify sender email uses verified domain
- Check spam/junk folder
- Test with different email providers

## 📊 MailerSend Pricing

**Free Tier**: 3,000 emails/month
**Basic Plan**: $27/month for 50,000 emails
**Professional Plan**: $80/month for 150,000 emails

For most digital product businesses, the free tier is sufficient to start.

## 🔗 Useful Links

- [MailerSend Dashboard](https://app.mailersend.com/)
- [MailerSend Documentation](https://developers.mailersend.com/)
- [DNS Record Help](https://developers.mailersend.com/guides/domain-authentication)
- [API Reference](https://developers.mailersend.com/api/v1/email.html)

## 💡 Pro Tips

1. **Use subdomain**: Consider `mail.yourdomain.com` for email sending
2. **Monitor deliverability**: Check MailerSend analytics regularly
3. **Test thoroughly**: Always test email delivery before going live
4. **Backup plan**: Keep download links as fallback if emails fail
5. **Customer support**: Include clear contact information in emails

---

**Need Help?** 
- Check MailerSend documentation: https://developers.mailersend.com/
- Contact MailerSend support: https://www.mailersend.com/help
- Review webhook logs for debugging