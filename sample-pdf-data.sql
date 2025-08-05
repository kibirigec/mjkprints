-- Sample PDF Products and File Uploads for MJK Prints
-- Run this SQL in your Supabase SQL Editor after the main schema setup

-- First, create some sample file uploads with PDF data
INSERT INTO file_uploads (
    id,
    product_id,
    file_name,
    file_size,
    file_type,
    storage_path,
    is_primary,
    page_count,
    dimensions,
    preview_urls,
    thumbnail_urls,
    processing_status,
    content_type
) VALUES 
-- Sample PDF 1: Digital Art Portfolio
(
    'pdf-1-uuid-sample-123456789',
    NULL, -- Will be updated after product creation
    'digital-art-portfolio.pdf',
    2048000, -- 2MB
    'application/pdf',
    'uploads/digital-art-portfolio.pdf',
    true,
    12,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    '[
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=1000&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=1000&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=1000&fit=crop&crop=center"
    ]',
    '{
        "small": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=200&h=250&fit=crop&crop=center",
        "medium": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=500&fit=crop&crop=center",
        "large": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=750&fit=crop&crop=center"
    }',
    'completed',
    'application/pdf'
),
-- Sample PDF 2: Wedding Invitation Suite
(
    'pdf-2-uuid-sample-234567890',
    NULL,
    'wedding-invitation-suite.pdf',
    1536000, -- 1.5MB
    'application/pdf',
    'uploads/wedding-invitation-suite.pdf',
    true,
    8,
    '{"width": 5, "height": 7, "unit": "inches"}',
    '[
        "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&h=1120&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&h=1120&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1604017011826-d3b4c23f8914?w=800&h=1120&fit=crop&crop=center"
    ]',
    '{
        "small": "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=200&h=280&fit=crop&crop=center",
        "medium": "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=400&h=560&fit=crop&crop=center",
        "large": "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=600&h=840&fit=crop&crop=center"
    }',
    'completed',
    'application/pdf'
),
-- Sample PDF 3: Business Card Templates
(
    'pdf-3-uuid-sample-345678901',
    NULL,
    'business-card-templates.pdf',
    1024000, -- 1MB
    'application/pdf',
    'uploads/business-card-templates.pdf',
    true,
    6,
    '{"width": 3.5, "height": 2, "unit": "inches"}',
    '[
        "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=457&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1606122017369-d782bbb78f32?w=800&h=457&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1606838493808-fb6de85de13e?w=800&h=457&fit=crop&crop=center"
    ]',
    '{
        "small": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=200&h=114&fit=crop&crop=center",
        "medium": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=229&fit=crop&crop=center",
        "large": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=343&fit=crop&crop=center"
    }',
    'completed',
    'application/pdf'
),
-- Sample PDF 4: Logo Design Collection
(
    'pdf-4-uuid-sample-456789012',
    NULL,
    'logo-design-collection.pdf',
    3072000, -- 3MB
    'application/pdf',
    'uploads/logo-design-collection.pdf',
    true,
    24,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    '[
        "https://images.unsplash.com/photo-1599658880436-c61792e70672?w=800&h=1000&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1606240724602-5b21f896eae7?w=800&h=1000&fit=crop&crop=center",
        "https://images.unsplash.com/photo-1606134449021-b8229017b6e4?w=800&h=1000&fit=crop&crop=center"
    ]',
    '{
        "small": "https://images.unsplash.com/photo-1599658880436-c61792e70672?w=200&h=250&fit=crop&crop=center",
        "medium": "https://images.unsplash.com/photo-1599658880436-c61792e70672?w=400&h=500&fit=crop&crop=center",
        "large": "https://images.unsplash.com/photo-1599658880436-c61792e70672?w=600&h=750&fit=crop&crop=center"
    }',
    'completed',
    'application/pdf'
);

-- Now create the PDF products and link them to the file uploads
INSERT INTO products (
    id,
    title,
    description,
    price,
    image,
    pdf_file_id,
    page_count,
    file_dimensions,
    print_specifications,
    preview_pages
) VALUES 
-- PDF Product 1: Digital Art Portfolio
(
    'product-pdf-1-uuid-123456',
    'Digital Art Portfolio Collection',
    'A comprehensive collection of 12 stunning digital artworks perfect for galleries, exhibitions, or personal collections. Each piece showcases unique artistic techniques and styles ranging from abstract expressionism to contemporary digital painting. High-resolution PDF format ensures crisp, professional quality for both digital display and print reproduction.',
    49.99,
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop&crop=center',
    'pdf-1-uuid-sample-123456789',
    12,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    '{"dpi": 300, "color_mode": "RGB", "bleed": 0.125}',
    3
),
-- PDF Product 2: Wedding Invitation Suite
(
    'product-pdf-2-uuid-234567',
    'Elegant Wedding Invitation Suite',
    'Complete wedding stationery suite including save-the-date cards, invitations, RSVP cards, and thank you notes. Features elegant typography and romantic floral designs perfect for modern weddings. Easily customizable templates in PDF format ready for professional printing or DIY projects.',
    34.99,
    'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&h=800&fit=crop&crop=center',
    'pdf-2-uuid-sample-234567890',
    8,
    '{"width": 5, "height": 7, "unit": "inches"}',
    '{"dpi": 300, "color_mode": "CMYK", "bleed": 0.125}',
    3
),
-- PDF Product 3: Business Card Templates
(
    'product-pdf-3-uuid-345678',
    'Professional Business Card Templates',
    'Six modern and professional business card designs suitable for various industries. Each template includes multiple color variations and layout options. Perfect for entrepreneurs, freelancers, and small businesses looking for premium card designs without the designer price tag.',
    19.99,
    'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&crop=center',
    'pdf-3-uuid-sample-345678901',
    6,
    '{"width": 3.5, "height": 2, "unit": "inches"}',
    '{"dpi": 300, "color_mode": "CMYK", "bleed": 0.125}',
    3
),
-- PDF Product 4: Logo Design Collection
(
    'product-pdf-4-uuid-456789',
    'Premium Logo Design Collection',
    'Extensive collection of 24 professional logo designs across various industries and styles. From minimalist wordmarks to complex emblems, this collection provides inspiration and ready-to-use designs for businesses, startups, and design projects. Each logo includes multiple format variations.',
    89.99,
    'https://images.unsplash.com/photo-1599658880436-c61792e70672?w=800&h=800&fit=crop&crop=center',
    'pdf-4-uuid-sample-456789012',
    24,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    '{"dpi": 300, "color_mode": "RGB", "bleed": 0}',
    5
);

-- Update the file_uploads with the correct product_id references
UPDATE file_uploads SET product_id = 'product-pdf-1-uuid-123456' WHERE id = 'pdf-1-uuid-sample-123456789';
UPDATE file_uploads SET product_id = 'product-pdf-2-uuid-234567' WHERE id = 'pdf-2-uuid-sample-234567890';
UPDATE file_uploads SET product_id = 'product-pdf-3-uuid-345678' WHERE id = 'pdf-3-uuid-sample-345678901';
UPDATE file_uploads SET product_id = 'product-pdf-4-uuid-456789' WHERE id = 'pdf-4-uuid-sample-456789012';

-- Add some processing examples (PDF that's still being processed)
INSERT INTO file_uploads (
    id,
    product_id,
    file_name,
    file_size,
    file_type,
    storage_path,
    is_primary,
    page_count,
    dimensions,
    preview_urls,
    thumbnail_urls,
    processing_status,
    processing_metadata,
    content_type
) VALUES 
(
    'pdf-processing-uuid-567890',
    NULL,
    'brochure-design-templates.pdf',
    2560000,
    'application/pdf',
    'uploads/brochure-design-templates.pdf',
    true,
    16,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    NULL,
    NULL,
    'processing',
    '{"status": "generating_previews", "progress": 75, "estimated_completion": "2024-01-01T12:30:00Z"}',
    'application/pdf'
);

INSERT INTO products (
    id,
    title,
    description,
    price,
    image,
    pdf_file_id,
    page_count,
    file_dimensions,
    print_specifications,
    preview_pages
) VALUES 
(
    'product-pdf-processing-567890',
    'Corporate Brochure Templates (Processing...)',
    'Professional brochure templates for corporate communications. Currently being processed - preview will be available shortly.',
    29.99,
    'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&crop=center',
    'pdf-processing-uuid-567890',
    16,
    '{"width": 8.5, "height": 11, "unit": "inches"}',
    '{"dpi": 300, "color_mode": "CMYK", "bleed": 0.125}',
    3
);

UPDATE file_uploads SET product_id = 'product-pdf-processing-567890' WHERE id = 'pdf-processing-uuid-567890';

-- Add comments for clarity
COMMENT ON TABLE file_uploads IS 'Sample data includes both completed and processing PDF files to demonstrate different states';
COMMENT ON TABLE products IS 'Sample data includes both regular image products and PDF products with various page counts';

-- Create a view for easy querying of products with their file information
CREATE OR REPLACE VIEW products_with_files AS
SELECT 
    p.*,
    f.file_name,
    f.file_size,
    f.processing_status,
    f.preview_urls,
    f.thumbnail_urls,
    f.processing_metadata,
    CASE 
        WHEN p.pdf_file_id IS NOT NULL THEN 'pdf'
        ELSE 'image'
    END as product_type
FROM products p
LEFT JOIN file_uploads f ON p.pdf_file_id = f.id;

-- Create indexes for better performance with the new data
CREATE INDEX IF NOT EXISTS idx_products_type ON products (
    CASE WHEN pdf_file_id IS NOT NULL THEN 'pdf' ELSE 'image' END
);

-- Summary query to verify the data
-- Uncomment to run this query and see the results:
/*
SELECT 
    title,
    price,
    product_type,
    page_count,
    processing_status,
    CASE 
        WHEN preview_urls IS NOT NULL THEN jsonb_array_length(preview_urls)
        ELSE 0
    END as preview_count
FROM products_with_files
ORDER BY created_at DESC;
*/