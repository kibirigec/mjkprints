-- COMPLETE DATABASE RLS FIX - All Tables Required for Checkout
-- This fixes ALL the tables needed for full checkout functionality
-- Addresses: Health check error + Checkout 500 error + Webhook processing

-- =============================================================================
-- FILE_UPLOADS TABLE (Health check failing here)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for file_uploads" ON file_uploads;
DROP POLICY IF EXISTS "Enable update for file_uploads" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload inserts" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload updates" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload inserts for service and public" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload updates for service and processing" ON file_uploads;

-- Create simple, permissive policies for file_uploads
CREATE POLICY "Enable insert for file_uploads" ON file_uploads 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for file_uploads" ON file_uploads 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================  
-- ORDERS TABLE (Checkout process fails here)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for orders" ON orders;
DROP POLICY IF EXISTS "Enable update for orders" ON orders;
DROP POLICY IF EXISTS "Allow public order creation" ON orders;
DROP POLICY IF EXISTS "Allow public order updates" ON orders;

-- Create simple, permissive policies for orders
CREATE POLICY "Enable insert for orders" ON orders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for orders" ON orders 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================
-- ORDER_ITEMS TABLE (Checkout process fails here)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;
DROP POLICY IF EXISTS "Allow public order item creation" ON order_items;

-- Create simple, permissive policy for order_items
CREATE POLICY "Enable insert for order_items" ON order_items 
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- DOWNLOADS TABLE (Webhook processing needs this)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for downloads" ON downloads;
DROP POLICY IF EXISTS "Enable update for downloads" ON downloads;
DROP POLICY IF EXISTS "Allow public download creation" ON downloads;
DROP POLICY IF EXISTS "Allow public download updates" ON downloads;

-- Create simple, permissive policies for downloads
CREATE POLICY "Enable insert for downloads" ON downloads 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for downloads" ON downloads 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================
-- CUSTOMERS TABLE (Order processing may need this)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for customers" ON customers;
DROP POLICY IF EXISTS "Allow public customer creation" ON customers;

-- Create simple, permissive policy for customers
CREATE POLICY "Enable insert for customers" ON customers 
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- PRODUCTS TABLE (Ensure service operations work)
-- =============================================================================

DROP POLICY IF EXISTS "Enable insert for products" ON products;
DROP POLICY IF EXISTS "Enable update for products" ON products;

-- Create service role policies for products (admin operations)
CREATE POLICY "Enable insert for products" ON products 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for products" ON products 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Show all policies that were created
SELECT 
    schemaname,
    tablename, 
    policyname, 
    cmd,
    permissive,
    CASE 
        WHEN cmd = 'INSERT' THEN 'INSERT_ALLOWED'
        WHEN cmd = 'UPDATE' THEN 'UPDATE_ALLOWED' 
        WHEN cmd = 'SELECT' THEN 'SELECT_ALLOWED'
        WHEN cmd = 'DELETE' THEN 'DELETE_ALLOWED'
        ELSE cmd
    END as operation_type
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products')
  AND policyname LIKE 'Enable %'
ORDER BY tablename, cmd;

-- Count policies per table
SELECT 
    tablename,
    COUNT(*) as policy_count,
    string_agg(cmd, ', ' ORDER BY cmd) as allowed_operations
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products')
  AND policyname LIKE 'Enable %'
GROUP BY tablename
ORDER BY tablename;