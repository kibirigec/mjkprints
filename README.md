# MJK Prints - Digital Art Marketplace 🎨

A **production-ready** Next.js storefront where independent designers can sell downloadable graphic prints. Features beautiful animations, Stripe payments, email delivery, and a complete admin system.

![MJK Prints](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop&crop=center)

## ✨ Features

### 🛍️ **Complete E-commerce Solution**
- **Stripe Payment Integration** - Secure checkout with webhooks
- **Digital Product Delivery** - Automatic email delivery with download links
- **Order Management** - Complete order tracking and history
- **Guest Checkout** - No account required for purchases

### 🎨 **Beautiful Design**
- **Premium Animations** - Smooth micro-interactions and loading states
- **Responsive Design** - Optimized for all devices
- **Modern UI** - Clean, gallery-style interface
- **Custom Brand Colors** - Professional dark blue and blush palette

### 🔧 **Developer Features**
- **TypeScript Ready** - Full type safety support
- **Database Integration** - Supabase with complete schema
- **Email Service** - SendGrid integration with beautiful templates
- **Admin Dashboard** - Product management interface
- **SEO Optimized** - Meta tags and structured data

### 🚀 **Performance**
- **Next.js 14** - Latest features and optimizations
- **Image Optimization** - Automatic WebP conversion and lazy loading
- **Skeleton Loading** - Improved perceived performance
- **Static Generation** - Lightning-fast page loads

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or later
- npm or yarn

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd mjkprints
   npm install
   ```

2. **Set up Supabase:**
   - Create a free account at [https://supabase.com](https://supabase.com)
   - Create a new project
   - Go to **Settings > API** in your Supabase dashboard
   - Copy your **Project URL** and **Project API Key (anon, public)**

3. **Configure environment variables:**
   - Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   - Update `.env.local` with your credentials:
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

   # Stripe Configuration  
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

   # Site Configuration
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Email Service (Optional)
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   SENDGRID_FROM_EMAIL=noreply@yoursite.com
   ```

4. **Set up the database:**
   - Go to **SQL Editor** in your Supabase dashboard
   - Copy and paste the contents of `supabase-setup.sql`
   - Run the SQL to create tables and insert sample data

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Set up Stripe (for payments):**
   - Create a [Stripe account](https://stripe.com)
   - Get your test API keys from the Stripe dashboard
   - Add them to your `.env.local` file
   - Set up a webhook endpoint pointing to `your-domain.com/api/webhooks/stripe`

7. **Set up SendGrid (for emails):**
   - Create a [SendGrid account](https://sendgrid.com)
   - Get your API key and add it to `.env.local`
   - Verify your sender email address

8. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎨 Brand Colors

- **Dark Blue:** `#2c3e50` - Primary brand color
- **Blush:** `#e0bfb8` - Secondary accent color  
- **Light Ivory:** `#f5f0e6` - Background and text accent

## 📁 Project Structure

```
mjkprints.store/
├── components/           # Reusable React components
│   ├── Header.js        # Navigation header with cart
│   ├── Footer.js        # Site footer
│   ├── ProductCard.js   # Product display cards
│   ├── ProductModal.js  # Product detail modal
│   ├── CartDrawer.js    # Shopping cart sidebar
│   └── DashboardTable.js # Seller product management
├── context/
│   └── CartContext.js   # Shopping cart state management
├── lib/
│   └── supabase.js      # Supabase client and database functions
├── pages/
│   ├── _app.js          # Next.js app wrapper
│   ├── _document.js     # HTML document structure
│   ├── index.js         # Homepage with product grid
│   ├── cart.js          # Shopping cart page
│   ├── dashboard.js     # Seller dashboard
│   ├── product/[id].js  # Dynamic product pages
│   └── api/             # API routes (stubs)
│       ├── products.js  # Product CRUD operations
│       ├── orders.js    # Order processing
│       └── auth.js      # Authentication stub
├── public/
│   ├── favicon.ico      # Site favicon
│   └── assets/          # Static assets
├── scripts/
│   └── setup-database.js # Database initialization script
├── styles/
│   ├── globals.css      # Global styles and Tailwind
│   └── tailwind.config.js # Tailwind configuration
├── supabase-setup.sql   # SQL schema and seed data
├── .env.local           # Environment variables (Supabase config)
└── package.json         # Dependencies and scripts
```

## 🛍️ Features

### Public Store
- **Homepage:** Hero section with featured products grid
- **Product Pages:** Detailed product views with high-res images
- **Shopping Cart:** Persistent cart with local storage
- **Responsive Design:** Mobile-first responsive layout
- **Instant Downloads:** Simulated digital product delivery

### Seller Dashboard
- **Product Management:** Add, edit, delete digital prints
- **Upload Interface:** Form-based product creation
- **Sales Overview:** Basic analytics and product listing
- **Demo Authentication:** Stubbed user authentication

### Technical Features
- **Next.js 14:** Latest version with App Router support
- **Tailwind CSS:** Utility-first styling with custom theme
- **React Context:** Global cart state management
- **Supabase:** PostgreSQL database with real-time capabilities
- **API Routes:** RESTful endpoints for data operations
- **Image Optimization:** Next.js Image component integration

## 🔧 Development Scripts

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint checks
```

## 🌐 Deployment

### Vercel (Recommended)
1. **Connect Repository:**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect Next.js configuration

2. **Environment Variables:**
   - Add all environment variables from `.env.local` to Vercel dashboard
   - Ensure production Stripe keys are used for live deployment

3. **Domain Setup:**
   - Configure your custom domain
   - Update `NEXT_PUBLIC_SITE_URL` to your production URL
   - Update Stripe webhook endpoint to your production domain

4. **Database Setup:**
   - Run the production SQL schema in your Supabase project
   - Ensure Row Level Security (RLS) is properly configured

### Other Platforms
The app can be deployed to any platform supporting Node.js:
- **Netlify** - Static site hosting with serverless functions
- **Railway** - Full-stack platform with database hosting
- **Heroku** - Container-based deployment
- **AWS Amplify** - Amazon's full-stack platform
- **DigitalOcean App Platform** - Simple cloud hosting

## 🔌 Integration Roadmap

This is a complete scaffold ready for production integrations:

### Database Integration
✅ **Supabase Integration Complete!**
- PostgreSQL database with full CRUD operations
- Real-time capabilities ready for future features
- Row Level Security (RLS) configured
- Sample data pre-loaded

### Authentication
```javascript
// Replace auth stub with:
- Auth0
- Firebase Auth  
- Supabase Auth
- NextAuth.js
```

### Payment Processing
```javascript
// Add to checkout flow:
- Stripe (recommended)
- PayPal
- Square
```

### File Storage & Delivery
```javascript
// Replace image URLs with:
- Cloudinary (images)
- AWS S3 (file storage)
- Vercel Blob (files)
```

### Email Service
```javascript
// Add to order completion:
- SendGrid
- Mailgun
- AWS SES
```

## 📊 API Documentation

### Products API
```bash
GET    /api/products           # List all products
POST   /api/products           # Create new product
GET    /api/products/[id]      # Get product by ID
PUT    /api/products/[id]      # Update product
DELETE /api/products/[id]      # Delete product
```

### Orders API
```bash
GET  /api/orders               # Get orders by email or order ID
POST /api/orders               # Create new order (legacy)
```

### Checkout API
```bash
POST /api/checkout/session     # Create Stripe checkout session
```

### Downloads API
```bash
GET  /api/downloads            # Get download links by email
```

### Webhooks
```bash
POST /api/webhooks/stripe      # Stripe webhook handler
```

## 🎯 Key Components

### CartContext
Manages global shopping cart state with localStorage persistence:
- `addToCart(product)` - Add item to cart
- `removeFromCart(id)` - Remove item from cart  
- `updateQuantity(id, quantity)` - Update item quantity
- `getTotal()` - Calculate cart total
- `clearCart()` - Empty the cart

### ProductCard
Reusable product display component with hover effects and quick add-to-cart functionality.

### Dashboard
Complete seller interface with product management, form validation, and responsive design.

## 🚦 Getting Started Development

1. **Explore the codebase:** Start with `pages/index.js` to understand the homepage
2. **Check components:** Review `components/` folder for reusable UI elements  
3. **Test API routes:** Use the dashboard to create/edit products and test API functionality
4. **Customize styling:** Modify `tailwind.config.js` and `styles/globals.css`
5. **Add integrations:** Follow the integration roadmap above

## 🤝 Contributing

This is a complete starter template. Customize it for your specific needs:

1. Update brand colors in `tailwind.config.js`
2. Replace sample products with your own data
3. Integrate with your preferred backend services
4. Add additional features as needed

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔧 Troubleshooting

### Common Issues:

**"Missing Supabase environment variables" error:**
- Ensure `.env.local` has the correct Supabase URL and API key
- Restart your development server after updating environment variables

**"Failed to connect to Supabase" error:**
- Check your Supabase project is active
- Verify your API keys are correct
- Run the SQL from `supabase-setup.sql` in your Supabase dashboard

**Products not showing on homepage:**
- Ensure you've run the database setup SQL
- Check your Supabase project has the `products` table with data

**Build errors related to Supabase:**
- Make sure environment variables are set in your deployment platform
- Use dynamic imports for Supabase functions in `getStaticProps`

---

**Ready to run out of the box!** 🎉

1. Set up your Supabase project
2. Update your environment variables  
3. Run the database setup SQL
4. Start with `npm install && npm run dev`

For questions or support, please refer to the Next.js, Tailwind CSS, and Supabase documentation.