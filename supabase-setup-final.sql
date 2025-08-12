-- MJK Prints - Minimal Database Schema
-- This is a clean, simplified schema that will deploy successfully in Supabase
-- Run this SQL in your Supabase SQL Editor

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Products table (digital art listings)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image TEXT NOT NULL, -- External image URL (backward compatibility)
    page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
    file_dimensions JSONB, -- {width, height, unit}
    print_specifications JSONB, -- {dpi, color_mode, bleed}
    preview_pages INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    -- Note: image_file_id and pdf_file_id columns are added below via migration script
);

-- File uploads table (digital file storage - supports both PDFs and images)
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    -- PDF-specific fields
    page_count INTEGER CHECK (page_count IS NULL OR page_count > 0),
    -- Image and PDF common fields
    dimensions JSONB, -- {width, height, unit, dpi?}
    preview_urls JSONB, -- Array of preview image URLs (for PDFs) or resized versions (for images)
    thumbnail_urls JSONB, -- {small, medium, large} thumbnail URLs
    -- Common processing fields
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_metadata JSONB, -- Error messages, logs, processing details
    checksum TEXT, -- File integrity verification
    content_type TEXT DEFAULT 'application/pdf',
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- Note: file_type, image_variants, color_profile, and orientation columns are added via migration below
);

-- Add columns and foreign key constraints (handles both fresh installs and migrations)
DO $$ 
BEGIN
    -- Add missing columns to products table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_file_id'
    ) THEN
        ALTER TABLE products ADD COLUMN image_file_id UUID;
        RAISE NOTICE 'Added image_file_id column to products table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'pdf_file_id'
    ) THEN
        ALTER TABLE products ADD COLUMN pdf_file_id UUID;
        RAISE NOTICE 'Added pdf_file_id column to products table';
    END IF;

    -- Add missing columns to file_uploads table for image support
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'file_uploads' AND column_name = 'file_type'
    ) THEN
        ALTER TABLE file_uploads ADD COLUMN file_type TEXT NOT NULL DEFAULT 'pdf';
        ALTER TABLE file_uploads ADD CONSTRAINT file_uploads_file_type_check CHECK (file_type IN ('pdf', 'image'));
        RAISE NOTICE 'Added file_type column to file_uploads table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'file_uploads' AND column_name = 'image_variants'
    ) THEN
        ALTER TABLE file_uploads ADD COLUMN image_variants JSONB;
        RAISE NOTICE 'Added image_variants column to file_uploads table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'file_uploads' AND column_name = 'color_profile'
    ) THEN
        ALTER TABLE file_uploads ADD COLUMN color_profile TEXT;
        RAISE NOTICE 'Added color_profile column to file_uploads table';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'file_uploads' AND column_name = 'orientation'
    ) THEN
        ALTER TABLE file_uploads ADD COLUMN orientation INTEGER;
        ALTER TABLE file_uploads ADD CONSTRAINT file_uploads_orientation_check CHECK (orientation IS NULL OR orientation IN (1,2,3,4,5,6,7,8));
        RAISE NOTICE 'Added orientation column to file_uploads table';
    END IF;

    -- Now add foreign key constraints (only after columns exist)
    
    -- PDF file constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_products_pdf_file_id'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_pdf_file_id 
        FOREIGN KEY (pdf_file_id) REFERENCES file_uploads(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint fk_products_pdf_file_id';
    END IF;
    
    -- Image file constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_products_image_file_id'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_image_file_id 
        FOREIGN KEY (image_file_id) REFERENCES file_uploads(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint fk_products_image_file_id';
    END IF;
END $$;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    stripe_customer_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
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

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downloads table (digital product delivery)
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

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================

-- Create storage bucket for PDF and image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mjk-prints-storage', 'mjk-prints-storage', true, 104857600, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access to products" ON products;
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
DROP POLICY IF EXISTS "Public read access to completed files" ON file_uploads;
DROP POLICY IF EXISTS "Public read access to completed file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload inserts" ON file_uploads;
DROP POLICY IF EXISTS "Allow inserts for file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Allow file upload updates" ON file_uploads;
DROP POLICY IF EXISTS "Allow updates for file processing" ON file_uploads;
DROP POLICY IF EXISTS "Users can view own customer data" ON customers;
DROP POLICY IF EXISTS "Users can view their own data" ON customers;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
DROP POLICY IF EXISTS "Users can view own downloads" ON downloads;
DROP POLICY IF EXISTS "Users can view their downloads" ON downloads;

-- Products: Public read access
CREATE POLICY "Public read access to products" ON products
    FOR SELECT TO public USING (true);

-- File uploads: Public read access for completed files
CREATE POLICY "Public read access to completed files" ON file_uploads
    FOR SELECT TO public USING (processing_status = 'completed');

CREATE POLICY "Allow file upload inserts" ON file_uploads
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow file upload updates" ON file_uploads
    FOR UPDATE TO public USING (true) WITH CHECK (true);

-- Customers: Users can only access their own data
CREATE POLICY "Users can view own customer data" ON customers
    FOR SELECT TO public USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Orders: Users can only access their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT TO public USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Order items: Users can view items from their orders
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT TO public USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        )
    );

-- Downloads: Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON downloads
    FOR SELECT TO public USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access to storage files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to files" ON storage.objects;
DROP POLICY IF EXISTS "Allow storage file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow file uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow storage file updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow file updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow storage file deletion" ON storage.objects;
DROP POLICY IF EXISTS "Allow file deletion" ON storage.objects;

-- Storage policies for file access
CREATE POLICY "Public read access to storage files" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow storage file uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow storage file updates" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'mjk-prints-storage')
WITH CHECK (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow storage file deletion" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'mjk-prints-storage');

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Essential indexes for query performance
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_pdf_file_id ON products(pdf_file_id);
CREATE INDEX IF NOT EXISTS idx_products_image_file_id ON products(image_file_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_product_id ON file_uploads(product_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_processing_status ON file_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_type ON file_uploads(file_type);
CREATE INDEX IF NOT EXISTS idx_file_uploads_content_type ON file_uploads(content_type);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_downloads_customer_email ON downloads(customer_email);
CREATE INDEX IF NOT EXISTS idx_downloads_expires_at ON downloads(expires_at);

-- JSONB indexes for structured data
CREATE INDEX IF NOT EXISTS idx_file_uploads_dimensions_gin ON file_uploads USING GIN (dimensions);
CREATE INDEX IF NOT EXISTS idx_file_uploads_image_variants_gin ON file_uploads USING GIN (image_variants);
CREATE INDEX IF NOT EXISTS idx_file_uploads_thumbnail_urls_gin ON file_uploads USING GIN (thumbnail_urls);
CREATE INDEX IF NOT EXISTS idx_products_file_dimensions_gin ON products USING GIN (file_dimensions);

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Function to update products when file processing completes
CREATE OR REPLACE FUNCTION update_product_from_file_upload()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.processing_status = 'completed' AND OLD.processing_status != 'completed' THEN
        -- Update products based on file type
        IF NEW.file_type = 'pdf' THEN
            UPDATE products 
            SET 
                pdf_file_id = NEW.id,
                page_count = NEW.page_count,
                file_dimensions = NEW.dimensions,
                updated_at = NOW()
            WHERE id = NEW.product_id AND NEW.is_primary = true;
        ELSIF NEW.file_type = 'image' THEN
            UPDATE products 
            SET 
                image_file_id = NEW.id,
                file_dimensions = NEW.dimensions,
                updated_at = NOW()
            WHERE id = NEW.product_id AND NEW.is_primary = true;
        END IF;
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

-- Function to cleanup expired processing files
CREATE OR REPLACE FUNCTION cleanup_failed_uploads()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    DELETE FROM file_uploads 
    WHERE processing_status IN ('processing', 'failed') 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get file upload statistics by type
CREATE OR REPLACE FUNCTION get_file_upload_stats()
RETURNS TABLE (
    file_type TEXT,
    total_count BIGINT,
    completed_count BIGINT,
    failed_count BIGINT,
    pending_count BIGINT,
    total_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fu.file_type,
        COUNT(*)::BIGINT as total_count,
        COUNT(CASE WHEN fu.processing_status = 'completed' THEN 1 END)::BIGINT as completed_count,
        COUNT(CASE WHEN fu.processing_status = 'failed' THEN 1 END)::BIGINT as failed_count,
        COUNT(CASE WHEN fu.processing_status = 'pending' THEN 1 END)::BIGINT as pending_count,
        ROUND(SUM(fu.file_size)::NUMERIC / 1048576, 2) as total_size_mb
    FROM file_uploads fu
    GROUP BY fu.file_type
    ORDER BY fu.file_type;
END;
$$ LANGUAGE plpgsql;

-- Function to validate image file constraints
CREATE OR REPLACE FUNCTION validate_image_file(
    p_file_type TEXT,
    p_content_type TEXT,
    p_file_size BIGINT
)
RETURNS TABLE (
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
BEGIN
    -- Check file type consistency
    IF p_file_type = 'image' THEN
        IF p_content_type NOT LIKE 'image/%' THEN
            RETURN QUERY SELECT false, 'Content type must be image/* for image files';
            RETURN;
        END IF;
        
        -- Check supported image formats
        IF p_content_type NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/bmp', 'image/svg+xml') THEN
            RETURN QUERY SELECT false, 'Unsupported image format: ' || p_content_type;
            RETURN;
        END IF;
        
        -- Check file size (max 100MB for images)
        IF p_file_size > 104857600 THEN
            RETURN QUERY SELECT false, 'Image file size exceeds 100MB limit';
            RETURN;
        END IF;
    ELSIF p_file_type = 'pdf' THEN
        IF p_content_type != 'application/pdf' THEN
            RETURN QUERY SELECT false, 'Content type must be application/pdf for PDF files';
            RETURN;
        END IF;
        
        -- Check file size (max 100MB for PDFs)
        IF p_file_size > 104857600 THEN
            RETURN QUERY SELECT false, 'PDF file size exceeds 100MB limit';
            RETURN;
        END IF;
    ELSE
        RETURN QUERY SELECT false, 'Invalid file type: must be either image or pdf';
        RETURN;
    END IF;
    
    RETURN QUERY SELECT true, 'File validation passed';
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Insert sample products for testing
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
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- VERIFICATION FUNCTION
-- =============================================================================

-- Simple verification function without problematic pg_policies reference
CREATE OR REPLACE FUNCTION verify_database_setup()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check if all tables exist
    RETURN QUERY
    SELECT 
        'Core Tables'::TEXT,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('products', 'file_uploads', 'customers', 'orders', 'order_items', 'downloads')
            ) = 6 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        'All 6 core tables created successfully'::TEXT;
    
    -- Check image support in products table
    RETURN QUERY
    SELECT 
        'Image Support'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'products' 
                AND column_name = 'image_file_id'
                AND table_schema = 'public'
            ) 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        'Products table supports both external URLs and uploaded images'::TEXT;
    
    -- Check file_uploads table supports image files
    RETURN QUERY
    SELECT 
        'File Types Support'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM information_schema.check_constraints 
                WHERE constraint_name LIKE '%file_type%'
                AND check_clause LIKE '%image%'
            ) 
            THEN 'OK'::TEXT 
            ELSE 'PARTIAL'::TEXT 
        END,
        'File uploads table supports both PDF and image files'::TEXT;
    
    -- Check if storage bucket exists
    RETURN QUERY
    SELECT 
        'Storage Bucket'::TEXT,
        CASE 
            WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mjk-prints-storage') 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        'Storage bucket mjk-prints-storage configured'::TEXT;
    
    -- Check sample data
    RETURN QUERY
    SELECT 
        'Sample Data'::TEXT,
        CASE 
            WHEN (SELECT COUNT(*) FROM products) >= 6 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        CONCAT('Products table contains ', (SELECT COUNT(*) FROM products), ' records')::TEXT;
    
    -- Check essential indexes
    RETURN QUERY
    SELECT 
        'Database Indexes'::TEXT,
        CASE 
            WHEN (
                SELECT COUNT(*) FROM pg_indexes 
                WHERE tablename IN ('products', 'file_uploads', 'orders', 'order_items', 'downloads')
            ) >= 8 
            THEN 'OK'::TEXT 
            ELSE 'PARTIAL'::TEXT 
        END,
        'Performance indexes created'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

-- Add helpful comments
COMMENT ON TABLE products IS 'Digital art products with PDF and image file support';
COMMENT ON TABLE file_uploads IS 'Storage metadata for uploaded digital files (PDFs and images)';
COMMENT ON TABLE customers IS 'Customer information for orders and downloads';
COMMENT ON TABLE orders IS 'Purchase records with Stripe integration';
COMMENT ON TABLE order_items IS 'Individual products within orders';
COMMENT ON TABLE downloads IS 'Time-limited download links for digital products';

-- Add column comments for clarity
COMMENT ON COLUMN products.image IS 'External image URL for backward compatibility';
COMMENT ON COLUMN products.image_file_id IS 'Reference to uploaded image file in file_uploads table';
COMMENT ON COLUMN products.pdf_file_id IS 'Reference to uploaded PDF file in file_uploads table';
COMMENT ON COLUMN file_uploads.file_type IS 'Type of file: pdf or image';
COMMENT ON COLUMN file_uploads.image_variants IS 'Generated image variants with URLs and dimensions';
COMMENT ON COLUMN file_uploads.color_profile IS 'Color profile information for images';
COMMENT ON COLUMN file_uploads.orientation IS 'EXIF orientation value for images (1-8)';

-- Run verification after setup
SELECT * FROM verify_database_setup();