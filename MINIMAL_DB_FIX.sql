-- MINIMAL DATABASE FIX - Only Essential Policies for Checkout
-- This is the absolute minimum needed to make checkout work

-- =============================================================================
-- ORDERS TABLE - Allow public order creation (checkout process)
-- =============================================================================

DROP POLICY IF EXISTS "Allow public order creation" ON orders;
DROP POLICY IF EXISTS "Allow public order updates" ON orders;
DROP POLICY IF EXISTS "Enable insert for orders" ON orders;
DROP POLICY IF EXISTS "Enable update for orders" ON orders;

-- Create simple policies for orders
CREATE POLICY "Enable insert for orders" ON orders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for orders" ON orders 
    FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================================================
-- ORDER_ITEMS TABLE - Allow public order item creation
-- =============================================================================

DROP POLICY IF EXISTS "Allow public order item creation" ON order_items;
DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;

-- Create simple policy for order items
CREATE POLICY "Enable insert for order_items" ON order_items 
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- VERIFICATION - Show current policies
-- =============================================================================

-- Check if policies were created successfully
SELECT tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;