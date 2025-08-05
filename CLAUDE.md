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
- **Payments**: Stripe Checkout + Webhooks
- **Email**: SendGrid with HTML templates
- **State**: React Context for cart + localStorage persistence

### Payment Flow Architecture
```
Cart → Email Collection → Stripe Checkout → Webhook → Order Creation → Email Delivery
```

1. User adds products to cart (CartContext + localStorage)
2. Checkout collects email via `/api/checkout/session`
3. Stripe processes payment and triggers webhook `/api/webhooks/stripe`
4. Webhook creates order, download links, and sends confirmation email
5. User receives email with download links (7-day expiration)

### Key Service Files
- `/lib/supabase.js` - Database operations (products, orders, downloads, customers)
- `/lib/stripe.js` - Payment processing and webhook verification
- `/lib/email.js` - SendGrid email templates and sending
- `/context/CartContext.js` - Shopping cart state management

## Agent Usage Guidelines

Use these specialized agents for specific development tasks:

### Payment & E-commerce
- **`payment-integration`** - Stripe webhook issues, new payment methods, subscription features
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

# Stripe (Required for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email Service (Optional - gracefully degrades)
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@yoursite.com
```

**Database Setup:**
1. Run `supabase-setup.sql` in Supabase SQL Editor to create schema (updated with minimal-schema structure)
2. Includes products, orders, customers, downloads, and file_uploads tables  
3. RLS policies configured with simplified permissions for file uploads
4. Backup available at `supabase-setup.sql.backup` if rollback needed

## Critical Development Patterns

### Webhook Security
```javascript
// Always verify webhook signatures in /api/webhooks/stripe
const event = verifyWebhookSignature(buf, signature, endpointSecret)
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
- **orders** - Purchase records with Stripe integration
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
1. Use `payment-integration` agent for Stripe integration guidance
2. Update `/lib/stripe.js` for new payment methods
3. Modify webhook handler in `/api/webhooks/stripe.js`
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

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
2. Test with development SendGrid account
3. Ensure responsive HTML design
4. Include unsubscribe links for compliance

## Production Deployment Checklist

- [ ] Environment variables configured in deployment platform
- [ ] Supabase production database schema deployed
- [ ] Stripe webhook endpoint configured with production URL
- [ ] SendGrid sender email verified
- [ ] Domain configured and SSL enabled
- [ ] Test complete purchase flow end-to-end

## Troubleshooting Common Issues

**"Failed to connect to Supabase"**
- Check environment variables are set correctly
- Verify Supabase project is active and database schema is deployed

**"Stripe webhook signature verification failed"**
- Ensure STRIPE_WEBHOOK_SECRET matches webhook endpoint secret
- Check webhook endpoint URL is correct (must be accessible from internet)

**"Email delivery failed"**
- Verify SENDGRID_API_KEY is valid
- Check sender email is verified in SendGrid
- Review SendGrid activity logs for delivery status

**Products not showing on homepage**
- Verify database schema is deployed (`supabase-setup.sql`)
- Check sample data was inserted into products table
- Review browser console for API errors