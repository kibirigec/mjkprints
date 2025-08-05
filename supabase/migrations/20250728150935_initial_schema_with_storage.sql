-- MJK Prints Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Create products table (without foreign key to file_uploads initially)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image TEXT NOT NULL,
    pdf_file_id UUID, -- Will add foreign key constraint later
    page_count INTEGER,
    file_dimensions JSONB, -- {width, height, unit}
    print_specifications JSONB, -- {dpi, color_mode, bleed}
    preview_pages INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO products (title, description, price, image) VALUES
(
    'Abstract Watercolor Mountains',
    'Beautiful abstract mountain landscape in soft watercolor tones. Perfect for modern home decor and office spaces.',
    15.99,
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop&crop=center'
),
(
    'Minimalist Geometric Pattern',
    'Clean and modern geometric design with neutral colors. Ideal for contemporary interior design projects.',
    12.99,
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop&crop=center'
),
(
    'Botanical Line Art Collection',
    'Elegant botanical illustrations in minimalist line art style. Set of 3 prints featuring different plant species.',
    24.99,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop&crop=center'
),
(
    'Vintage Typography Poster',
    'Retro-inspired typography design with motivational quote. Perfect for creative spaces and home offices.',
    18.99,
    'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&crop=center'
),
(
    'Ocean Wave Abstract',
    'Flowing abstract design inspired by ocean waves. Calming blue and white color palette for peaceful spaces.',
    16.99,
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&h=800&fit=crop&crop=center'
),
(
    'Modern Art Deco Pattern',
    'Sophisticated Art Deco inspired pattern in gold and black. Luxury design perfect for elegant interiors.',
    22.99,
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop&crop=center'
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- Store email for guest checkouts
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_session_id TEXT UNIQUE,
    payment_method TEXT DEFAULT 'card',
    billing_details JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create downloads table for digital product delivery
CREATE TABLE IF NOT EXISTS downloads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    customer_email TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    download_url TEXT NOT NULL,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_downloaded_at TIMESTAMPTZ
);

-- Create file_uploads table for storing digital products
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    page_count INTEGER,
    dimensions JSONB, -- {width, height, unit}
    preview_urls JSONB, -- Array of preview image URLs
    thumbnail_urls JSONB, -- {small, medium, large} thumbnail URLs
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_metadata JSONB, -- Error messages, logs, processing details
    checksum TEXT, -- File integrity verification
    content_type TEXT DEFAULT 'application/pdf',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint from products to file_uploads (now that both tables exist)
ALTER TABLE products 
ADD CONSTRAINT fk_products_pdf_file_id 
FOREIGN KEY (pdf_file_id) REFERENCES file_uploads(id) ON DELETE SET NULL;

-- Add updated_at trigger for customers
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Products: Allow all operations for now (public gallery)
CREATE POLICY "Allow all operations on products" ON products
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- Customers: Users can only see/modify their own data
CREATE POLICY "Users can view their own data" ON customers
    FOR SELECT
    TO public
    USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Users can update their own data" ON customers
    FOR UPDATE
    TO public
    USING (auth.jwt() ->> 'email' = email)
    WITH CHECK (auth.jwt() ->> 'email' = email);

-- Orders: Users can only see their own orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT
    TO public
    USING (email = (auth.jwt() ->> 'email') OR customer_id IN (
        SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
    ));

-- Order items: Users can view items from their orders
CREATE POLICY "Users can view their order items" ON order_items
    FOR SELECT
    TO public
    USING (order_id IN (
        SELECT id FROM orders WHERE email = (auth.jwt() ->> 'email')
    ));

-- Downloads: Users can view their downloads
CREATE POLICY "Users can view their downloads" ON downloads
    FOR SELECT
    TO public
    USING (customer_email = (auth.jwt() ->> 'email'));

-- File uploads: Public read access for completed files
CREATE POLICY "Public read access to completed file uploads" ON file_uploads
    FOR SELECT
    TO public
    USING (processing_status = 'completed');

-- File uploads: Allow inserts for authenticated users (for admin/upload system)
CREATE POLICY "Allow inserts for file uploads" ON file_uploads
    FOR INSERT
    TO public
    WITH CHECK (true);

-- File uploads: Allow updates for processing status
CREATE POLICY "Allow updates for file processing" ON file_uploads
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_customer_email ON downloads(customer_email);
CREATE INDEX IF NOT EXISTS idx_downloads_product_id ON downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_expires_at ON downloads(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_uploads_product_id ON file_uploads(product_id);

-- Additional indexes for PDF support
CREATE INDEX IF NOT EXISTS idx_products_pdf_file_id ON products(pdf_file_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_processing_status ON file_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_content_type ON file_uploads(content_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_checksum ON file_uploads(checksum);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_file_uploads_product_status ON file_uploads(product_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_products_price_created ON products(price, created_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_file_uploads_dimensions_gin ON file_uploads USING GIN (dimensions);
CREATE INDEX IF NOT EXISTS idx_file_uploads_preview_urls_gin ON file_uploads USING GIN (preview_urls);
CREATE INDEX IF NOT EXISTS idx_products_file_dimensions_gin ON products USING GIN (file_dimensions);
CREATE INDEX IF NOT EXISTS idx_products_print_specs_gin ON products USING GIN (print_specifications);

-- =============================================================================
-- STORAGE BUCKET SETUP FOR PDF UPLOADS
-- =============================================================================
-- 
-- This section creates the Supabase storage bucket for handling PDF file uploads
-- and preview image generation for the MJK Prints digital marketplace.
--
-- IMPORTANT SETUP NOTES:
-- 1. This must be run in the Supabase SQL Editor with elevated privileges
-- 2. The bucket creation requires service role permissions
-- 3. File size limit is set to 50MB (52,428,800 bytes) to match API validation
-- 4. Allowed MIME types: PDF, JPEG, PNG, WebP for comprehensive file support
--
-- PRODUCTION CONSIDERATIONS:
-- - Consider restricting upload policies to authenticated users only
-- - Monitor storage usage and implement cleanup policies
-- - Set up automated backups for critical uploaded files
-- - Consider implementing virus scanning for uploaded files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mjk-prints-storage', 'mjk-prints-storage', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for secure file access
-- These policies control who can read, upload, and modify files in the storage bucket

-- Policy 1: Public read access for completed and processed files
CREATE POLICY "Public read access to files" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'mjk-prints-storage');

-- Policy 2: Allow uploads for any user (needed for admin/upload system)
-- In production, you may want to restrict this to authenticated users only
CREATE POLICY "Allow file uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'mjk-prints-storage');

-- Policy 3: Allow updates for processing status and metadata
CREATE POLICY "Allow file updates" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'mjk-prints-storage')
WITH CHECK (bucket_id = 'mjk-prints-storage');

-- Policy 4: Allow deletion for cleanup operations
CREATE POLICY "Allow file deletion" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'mjk-prints-storage');

-- Utility functions for PDF processing
CREATE OR REPLACE FUNCTION update_product_from_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    -- When a file upload is marked as completed, update the related product
    IF NEW.processing_status = 'completed' AND OLD.processing_status != 'completed' THEN
        UPDATE products 
        SET 
            pdf_file_id = NEW.id,
            page_count = NEW.page_count,
            file_dimensions = NEW.dimensions,
            updated_at = NOW()
        WHERE id = NEW.product_id AND NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update products when file processing completes
DROP TRIGGER IF EXISTS trigger_update_product_from_file ON file_uploads;
CREATE TRIGGER trigger_update_product_from_file
    AFTER UPDATE ON file_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_product_from_file_upload();

-- Function to get products with file information
CREATE OR REPLACE FUNCTION get_products_with_files()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL(10,2),
    image TEXT,
    pdf_file_id UUID,
    page_count INTEGER,
    file_dimensions JSONB,
    print_specifications JSONB,
    preview_pages INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    file_info JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.*,
        CASE 
            WHEN f.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', f.id,
                    'file_name', f.file_name,
                    'file_size', f.file_size,
                    'processing_status', f.processing_status,
                    'preview_urls', f.preview_urls,
                    'thumbnail_urls', f.thumbnail_urls,
                    'dimensions', f.dimensions,
                    'page_count', f.page_count
                )
            ELSE NULL
        END as file_info
    FROM products p
    LEFT JOIN file_uploads f ON p.pdf_file_id = f.id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate file integrity
CREATE OR REPLACE FUNCTION validate_file_checksum(file_id UUID, expected_checksum TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    stored_checksum TEXT;
BEGIN
    SELECT checksum INTO stored_checksum 
    FROM file_uploads 
    WHERE id = file_id;
    
    RETURN stored_checksum = expected_checksum;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired processing files
CREATE OR REPLACE FUNCTION cleanup_failed_uploads()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Delete file_uploads that have been in 'processing' or 'failed' state for more than 24 hours
    DELETE FROM file_uploads 
    WHERE processing_status IN ('processing', 'failed') 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to verify storage bucket setup
CREATE OR REPLACE FUNCTION verify_storage_setup()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if bucket exists
    RETURN QUERY
    SELECT 
        'Storage Bucket'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mjk-prints-storage') 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CASE 
            WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mjk-prints-storage') 
            THEN 'Bucket mjk-prints-storage exists'::TEXT
            ELSE 'Bucket mjk-prints-storage not found - run storage setup'::TEXT
        END;
    
    -- Check bucket configuration
    RETURN QUERY
    SELECT 
        'Bucket Config'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM storage.buckets 
                WHERE id = 'mjk-prints-storage' 
                AND file_size_limit = 52428800 
                AND 'application/pdf' = ANY(allowed_mime_types)
            ) 
            THEN 'OK'::TEXT 
            ELSE 'MISCONFIGURED'::TEXT 
        END,
        'File size limit: 50MB, MIME types: PDF, JPEG, PNG, WebP'::TEXT;
    
    -- Check storage policies
    RETURN QUERY
    SELECT 
        'Storage Policies'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'objects' 
                AND schemaname = 'storage'
                AND policyname LIKE '%mjk-prints-storage%'
            ) 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        'RLS policies for storage bucket access'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get storage usage statistics
CREATE OR REPLACE FUNCTION get_storage_stats()
RETURNS TABLE (
    total_files BIGINT,
    total_size_bytes BIGINT,
    total_size_mb NUMERIC(10,2),
    pdf_files BIGINT,
    image_files BIGINT,
    average_file_size_mb NUMERIC(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_files,
        COALESCE(SUM((metadata->>'size')::BIGINT), 0)::BIGINT as total_size_bytes,
        ROUND(COALESCE(SUM((metadata->>'size')::BIGINT), 0) / 1048576.0, 2) as total_size_mb,
        COUNT(*) FILTER (WHERE (metadata->>'mimetype') LIKE 'application/pdf')::BIGINT as pdf_files,
        COUNT(*) FILTER (WHERE (metadata->>'mimetype') LIKE 'image/%')::BIGINT as image_files,
        ROUND(COALESCE(AVG((metadata->>'size')::BIGINT), 0) / 1048576.0, 2) as average_file_size_mb
    FROM storage.objects 
    WHERE bucket_id = 'mjk-prints-storage';
END;
$$ LANGUAGE plpgsql;

-- Add constraints for data integrity
ALTER TABLE products 
ADD CONSTRAINT check_page_count_positive 
CHECK (page_count IS NULL OR page_count > 0);

ALTER TABLE file_uploads 
ADD CONSTRAINT check_file_page_count_positive 
CHECK (page_count IS NULL OR page_count > 0);

-- Add comments for documentation
COMMENT ON TABLE products IS 'Digital art products with PDF file support';
COMMENT ON COLUMN products.pdf_file_id IS 'Reference to the primary PDF file in file_uploads table';
COMMENT ON COLUMN products.page_count IS 'Number of pages in the PDF file';
COMMENT ON COLUMN products.file_dimensions IS 'File dimensions in format {width, height, unit}';
COMMENT ON COLUMN products.print_specifications IS 'Print specs in format {dpi, color_mode, bleed}';
COMMENT ON COLUMN products.preview_pages IS 'Number of preview pages to show (default 3)';

COMMENT ON TABLE file_uploads IS 'Storage metadata for uploaded digital files';
COMMENT ON COLUMN file_uploads.processing_status IS 'Status of file processing: pending, processing, completed, failed';
COMMENT ON COLUMN file_uploads.processing_metadata IS 'JSON metadata about processing (errors, logs, etc.)';
COMMENT ON COLUMN file_uploads.checksum IS 'File integrity checksum (SHA-256)';
COMMENT ON COLUMN file_uploads.preview_urls IS 'Array of preview image URLs generated from PDF';
COMMENT ON COLUMN file_uploads.thumbnail_urls IS 'Thumbnail URLs in different sizes {small, medium, large}';