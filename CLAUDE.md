# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev     # Start development server (http://localhost:3000)
npm run build   # Build for production 
npm run start   # Start production server
npm run lint    # Run ESLint checks
```

**Note:** `npm run dev` is always running in development - don't restart it unless explicitly needed.

## Architecture Overview

MJK Prints is a **production-ready digital art marketplace** built with Next.js 14, featuring:

### Core Architecture
- **Frontend**: React 18 + Tailwind CSS with custom animations
- **Backend**: Next.js API Routes + Supabase PostgreSQL 
- **Payments**: PayPal Checkout + Webhooks
- **Email**: MailerSend with HTML templates and file attachments
- **State**: React Context for cart + localStorage persistence

### Payment Flow Architecture
```
Cart → Email Collection → PayPal Checkout → Webhook → Order Creation → Email Delivery
```

1. User adds products to cart (CartContext + localStorage)
2. Checkout collects email via `/api/checkout/session`
3. PayPal processes payment and triggers webhook `/api/webhooks/paypal`
4. Webhook creates order, download links, and sends confirmation email
5. User receives email with download links (7-day expiration)

### Key Service Files
- `/lib/supabase.js` - Database operations (products, orders, downloads, customers)
- `/lib/paypal.js` - PayPal payment processing and webhook verification
- `/lib/email.js` - MailerSend email templates, attachments, and sending
- `/context/CartContext.js` - Shopping cart state management

## Agent Usage Guidelines

Use these specialized agents for specific development tasks:

### Payment & E-commerce
- **`payment-integration`** - PayPal webhook issues, new payment methods, subscription features
- **`backend-architect`** - API route design, database schema changes, order processing logic

### Frontend Development  
- **`frontend-developer`** - React components, animations, responsive design, cart functionality
- **`code-reviewer`** - Component reviews, ensuring design consistency, animation performance

### Database & Performance
- **`database-optimizer`** - Query optimization in `/lib/supabase.js`, RLS policies, indexing
- **`performance-engineer`** - Product loading optimization, image handling, checkout performance.

### Production & Debugging
- **`devops-troubleshooter`** - Webhook failures, email delivery issues, environment setup
- **`incident-responder`** - Payment processing outages, critical bugs, data integrity issues
- **`security-auditor`** - Payment security, user data handling, API endpoint security

### Documentation & Architecture
- **`architect-reviewer`** - Reviewing major structural changes, API design patterns
- **`api-documenter`** - Updating API documentation, webhook documentation

## Environment Setup

**Required Environment Variables:**
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# PayPal (Required for payments)
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id_here
PAYPAL_ENVIRONMENT=sandbox

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Service (Required for order confirmations)
MAILERSEND_API_KEY=your_mailersend_api_key_here
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=MJK Prints
```

**Database Setup:**
1. Run `supabase-setup.sql` in Supabase SQL Editor to create schema (updated with minimal-schema structure)
2. Includes products, orders, customers, downloads, and file_uploads tables  
3. RLS policies configured with simplified permissions for file uploads
4. Backup available at `supabase-setup.sql.backup` if rollback needed

## Critical Development Patterns

### Webhook Security
```javascript
// Always verify webhook signatures in /api/webhooks/paypal
const isValid = await verifyPayPalWebhookSignature(payload, headers)
```

### Database Operations
```javascript
// Use lib/supabase.js functions, never direct queries in components
const order = await createOrder(orderData)
const orderItems = await createOrderItems(order.id, items)
```

### Cart State Management
```javascript
// CartContext provides: addToCart, removeFromCart, updateQuantity, getTotal, clearCart
// Automatically persists to localStorage
const { cart, addToCart } = useCart()
```

### Error Handling
- API routes return consistent error format: `{ error: 'message', details?: 'specifics' }`
- Frontend shows user-friendly messages, logs technical details
- Webhook failures are logged but don't break user experience

## Brand & Design System

### Colors (Tailwind Config)
- **Primary**: `#2c3e50` (sophisticated dark blue)
- **Secondary**: `#e0bfb8` (warm blush pink)  
- **Accent**: `#f5f0e6` (elegant light ivory)
- **Variations**: `primary-light`, `secondary-dark`, etc.

### Component Patterns
- Product cards use hover animations and loading states
- Forms include validation and loading indicators
- Modals and drawers follow consistent animation patterns
- All components are mobile-responsive by default

## Database Schema Overview

### Core Tables
- **products** - Digital art listings with metadata
- **orders** - Purchase records with PayPal integration
- **order_items** - Individual products within orders
- **customers** - Customer records (optional, supports guest checkout)
- **downloads** - Time-limited download links with usage tracking
- **file_uploads** - Digital file storage references

### Key Relationships
- Orders → Order Items → Products
- Orders → Downloads (via Order Items)
- Customers → Orders (optional relationship)

## Common Development Scenarios

### Adding New Payment Features
1. Use `payment-integration` agent for PayPal integration guidance
2. Update `/lib/paypal.js` for new payment methods
3. Modify webhook handler in `/api/webhooks/paypal.js`
4. Test with PayPal Developer Console webhook simulator

### Modifying Product Display
1. Use `frontend-developer` agent for component changes
2. Update `components/ProductCard.js` or `pages/product/[id].js`
3. Ensure mobile responsiveness and loading states
4. Test animations and hover effects

### Database Schema Changes
1. Use `database-optimizer` agent for schema guidance
2. Update `supabase-setup.sql` with new schema
3. Modify functions in `/lib/supabase.js`
4. Update TypeScript types if using TypeScript
5. Test RLS policies for security

### Email Template Updates
1. Modify templates in `/lib/email.js`
2. Test with development MailerSend account using `node test-mailersend.js`
3. Ensure responsive HTML design and file attachment support
4. Verify mobile compatibility for email templates

## Production Deployment Checklist

- [ ] Environment variables configured in deployment platform
- [ ] Supabase production database schema deployed
- [ ] PayPal webhook endpoint configured with production URL
- [ ] MailerSend domain verified and sender email configured
- [ ] Domain configured and SSL enabled
- [ ] Test complete purchase flow end-to-end

## Troubleshooting Common Issues

**"Failed to connect to Supabase"**
- Check environment variables are set correctly
- Verify Supabase project is active and database schema is deployed

**"PayPal webhook signature verification failed"**
- Ensure PAYPAL_WEBHOOK_ID matches webhook endpoint ID in PayPal Developer Console
- Check webhook endpoint URL is correct (must be accessible from internet)
- Verify PayPal environment (sandbox vs live) matches configuration

**"Email delivery failed"**
- Verify MAILERSEND_API_KEY is valid
- Check domain is verified in MailerSend dashboard  
- Ensure sender email is configured correctly
- Review MailerSend activity logs for delivery status
- Test using `node test-mailersend.js` in development

**Products not showing on homepage**
- Verify database schema is deployed (`supabase-setup.sql`)
- Check sample data was inserted into products table
- Review browser console for API errors