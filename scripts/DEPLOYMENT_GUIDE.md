# Minimal Schema Deployment Guide

This guide walks you through deploying the clean, error-free database schema for MJK Prints.

## 🎯 Quick Deploy (2 minutes)

### Step 1: Deploy Schema
1. Open your **Supabase Dashboard** → SQL Editor
2. Copy the contents of `/scripts/minimal-schema.sql`
3. Paste into SQL Editor and click **Run**
4. Wait for "Success. No rows returned" message

### Step 2: Verify Deployment
```bash
node scripts/verify-minimal-setup.js
```

You should see:
```
🎉 Verification Complete - All Systems Ready!
✅ Database schema deployed successfully
✅ All 6 core tables created
✅ Storage bucket configured
✅ Sample data loaded
✅ Basic operations working
```

## 📋 What Gets Created

### Core Tables (6 total)
- **products** - Digital art listings with PDF support
- **file_uploads** - File metadata and processing status
- **customers** - Customer information
- **orders** - Purchase records with Stripe integration
- **order_items** - Individual products within orders
- **downloads** - Time-limited download links

### Storage Configuration
- **Bucket**: `mjk-prints-storage`
- **Size Limit**: 50MB per file
- **Allowed Types**: PDF, JPEG, PNG, WebP
- **Public Access**: Enabled for completed files

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- **Public read access** for products and completed files
- **User-specific access** for orders and downloads
- **Secure file upload** policies

## 🔧 Manual Verification Steps

If the automated verification fails, check these manually:

### 1. Check Tables Exist
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'file_uploads', 'customers', 'orders', 'order_items', 'downloads');
```
Should return 6 rows.

### 2. Check Storage Bucket
```sql
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'mjk-prints-storage';
```
Should return 1 row with 50MB limit.

### 3. Check Sample Data
```sql
SELECT COUNT(*) as product_count FROM products;
```
Should return 6 products.

### 4. Test Storage Policies
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```
Should show storage access policies.

## 🚨 Troubleshooting

### "Syntax error near pg_poli"
❌ **Problem**: Old schema file with syntax errors
✅ **Solution**: Use the new `minimal-schema.sql` file

### "Bucket already exists"
❌ **Problem**: Trying to recreate existing bucket
✅ **Solution**: Schema uses `ON CONFLICT` - this is expected

### "Failed to fetch products"
❌ **Problem**: RLS policies too restrictive
✅ **Solution**: Check if products table has public read policy

### "Storage bucket not accessible"
❌ **Problem**: Missing storage policies
✅ **Solution**: Re-run the storage policy section of the schema

## 📊 Performance Features

### Optimized Indexes
- Products by creation date (for homepage)
- File uploads by processing status
- Orders by email and status
- JSONB indexes for file dimensions

### Efficient Queries
- Products with file information joins
- Customer order history lookups
- Download expiration checks

## 🔐 Security Features

### Data Protection
- Email-based access control for orders
- Time-limited download links
- File integrity checksums
- Processing status tracking

### Storage Security
- Public read for completed files only
- Secure upload policies
- File type validation
- Size limit enforcement

## 🎯 Next Steps After Deployment

1. **Test PDF Upload**
   ```bash
   # Upload a test PDF via the web interface
   # Check file_uploads table for processing status
   ```

2. **Test Order Flow**
   ```bash
   # Create test order via Stripe checkout
   # Verify order and download creation
   ```

3. **Monitor System Health**
   ```bash
   # Check API endpoints are working
   # Monitor error logs
   ```

## 📞 Support

If you encounter issues:

1. **Check the verification output** for specific error details
2. **Review Supabase logs** in the dashboard
3. **Verify environment variables** are set correctly
4. **Test individual API endpoints** manually

The minimal schema is designed to be error-free and deploy successfully in any Supabase instance.