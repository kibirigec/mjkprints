-- Safe Database RLS Policy Fix - Handles Existing Policies
-- This script safely creates only missing policies

-- Drop and recreate policies to ensure they're correct
-- This approach avoids "already exists" errors

-- =============================================================================
-- ORDERS TABLE POLICIES
-- =============================================================================

-- Drop existing policies first (IF EXISTS prevents errors)
DROP POLICY IF EXISTS "Allow public order creation" ON orders;
DROP POLICY IF EXISTS "Allow public order updates" ON orders;  
DROP POLICY IF EXISTS "Allow service role all operations on orders" ON orders;

-- Recreate with correct permissions
CREATE POLICY "Allow public order creation" ON orders
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public order updates" ON orders
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations on orders" ON orders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- ORDER ITEMS TABLE POLICIES  
-- =============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow public order item creation" ON order_items;
DROP POLICY IF EXISTS "Allow service role all operations on order_items" ON order_items;

-- Recreate with correct permissions
CREATE POLICY "Allow public order item creation" ON order_items
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow service role all operations on order_items" ON order_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- DOWNLOADS TABLE POLICIES
-- =============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow public download creation" ON downloads;
DROP POLICY IF EXISTS "Allow public download updates" ON downloads;
DROP POLICY IF EXISTS "Allow service role all operations on downloads" ON downloads;

-- Recreate with correct permissions
CREATE POLICY "Allow public download creation" ON downloads
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public download updates" ON downloads
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all operations on downloads" ON downloads
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- CUSTOMERS TABLE POLICIES
-- =============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow public customer creation" ON customers;
DROP POLICY IF EXISTS "Allow service role all operations on customers" ON customers;

-- Recreate with correct permissions
CREATE POLICY "Allow public customer creation" ON customers
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow service role all operations on customers" ON customers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- FILE UPLOADS TABLE POLICIES (Already partially fixed)
-- =============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow file upload inserts for service and public" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload updates for service and processing" ON file_uploads;

-- Recreate with correct permissions
CREATE POLICY "Allow file upload inserts for service and public" ON file_uploads
    FOR INSERT TO public WITH CHECK (auth.role() = 'service_role' OR true);

CREATE POLICY "Allow file upload updates for service and processing" ON file_uploads
    FOR UPDATE TO public USING (auth.role() = 'service_role' OR true) 
    WITH CHECK (auth.role() = 'service_role' OR true);

-- =============================================================================
-- PRODUCTS TABLE POLICIES
-- =============================================================================

-- Drop existing policies first
DROP POLICY IF EXISTS "Allow service role all operations on products" ON products;

-- Recreate with correct permissions
CREATE POLICY "Allow service role all operations on products" ON products
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Show all current policies for verification
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items', 'downloads', 'customers', 'file_uploads', 'products')
ORDER BY tablename, policyname;