-- Fix RLS Policies for Checkout and Health Check
-- This migration fixes missing INSERT policies that were causing:
-- 1. Checkout 500 errors on order creation
-- 2. Health check failures on file_uploads table
-- 3. Webhook processing failures

-- =============================================================================
-- FILE_UPLOADS TABLE (Health check failing here)
-- =============================================================================

-- Drop existing incomplete policies
DROP POLICY IF EXISTS "Allow inserts for file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Allow updates for file processing" ON file_uploads;
DROP POLICY IF EXISTS "Enable insert for file_uploads" ON file_uploads;
DROP POLICY IF EXISTS "Enable update for file_uploads" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload inserts" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload updates" ON file_uploads;

-- Create comprehensive policies for file_uploads
CREATE POLICY "Enable insert for file_uploads" ON file_uploads 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for file_uploads" ON file_uploads 
    FOR UPDATE USING (true) WITH CHECK (true);

-- Keep existing SELECT policy for public read access to completed files
-- (Don't touch the existing "Public read access to completed file uploads" policy)

-- =============================================================================  
-- ORDERS TABLE (Checkout process fails here)
-- =============================================================================

-- Drop any existing incomplete INSERT/UPDATE policies
DROP POLICY IF EXISTS "Enable insert for orders" ON orders;
DROP POLICY IF EXISTS "Enable update for orders" ON orders;
DROP POLICY IF EXISTS "Allow public order creation" ON orders;
DROP POLICY IF EXISTS "Allow public order updates" ON orders;

-- Create comprehensive policies for orders
CREATE POLICY "Enable insert for orders" ON orders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for orders" ON orders 
    FOR UPDATE USING (true) WITH CHECK (true);

-- Keep existing SELECT policy for user-specific order access
-- (Don't touch the existing "Users can view their own orders" policy)

-- =============================================================================
-- ORDER_ITEMS TABLE (Checkout process fails here)
-- =============================================================================

-- Drop any existing incomplete INSERT policies
DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;
DROP POLICY IF EXISTS "Allow public order item creation" ON order_items;

-- Create comprehensive policy for order_items
CREATE POLICY "Enable insert for order_items" ON order_items 
    FOR INSERT WITH CHECK (true);

-- Keep existing SELECT policy for user-specific order item access
-- (Don't touch the existing "Users can view their order items" policy)

-- =============================================================================
-- DOWNLOADS TABLE (Webhook processing needs this)
-- =============================================================================

-- Drop any existing incomplete INSERT/UPDATE policies
DROP POLICY IF EXISTS "Enable insert for downloads" ON downloads;
DROP POLICY IF EXISTS "Enable update for downloads" ON downloads;
DROP POLICY IF EXISTS "Allow public download creation" ON downloads;
DROP POLICY IF EXISTS "Allow public download updates" ON downloads;

-- Create comprehensive policies for downloads
CREATE POLICY "Enable insert for downloads" ON downloads 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for downloads" ON downloads 
    FOR UPDATE USING (true) WITH CHECK (true);

-- Keep existing SELECT policy for user-specific download access
-- (Don't touch the existing "Users can view their downloads" policy)

-- =============================================================================
-- CUSTOMERS TABLE (Order processing may need this)
-- =============================================================================

-- Drop any existing incomplete INSERT policies
DROP POLICY IF EXISTS "Enable insert for customers" ON customers;
DROP POLICY IF EXISTS "Allow public customer creation" ON customers;

-- Create comprehensive policy for customers
CREATE POLICY "Enable insert for customers" ON customers 
    FOR INSERT WITH CHECK (true);

-- Keep existing SELECT/UPDATE policies for user-specific access
-- (Don't touch existing "Users can view their own data" and "Users can update their own data" policies)

-- =============================================================================
-- PRODUCTS TABLE (Ensure service operations work for admin functions)
-- =============================================================================

-- Note: Products already has "Allow all operations on products" policy from initial migration
-- This is correct for a public gallery, but let's ensure INSERT/UPDATE work for admin operations

-- Drop any existing incomplete policies (if any)
DROP POLICY IF EXISTS "Enable insert for products" ON products;
DROP POLICY IF EXISTS "Enable update for products" ON products;

-- Create service role policies for products (admin operations)
-- These are in addition to the existing "Allow all operations on products" policy
CREATE POLICY "Enable insert for products service" ON products 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for products service" ON products 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show all INSERT/UPDATE policies that were created
SELECT 
    schemaname,
    tablename, 
    policyname, 
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products')
  AND cmd IN ('INSERT', 'UPDATE')
  AND policyname LIKE 'Enable %'
ORDER BY tablename, cmd;

-- Summary: Count policies per table
SELECT 
    tablename,
    COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
    COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
    COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products')
GROUP BY tablename
ORDER BY tablename;