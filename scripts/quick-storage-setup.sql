-- =============================================================================
-- CRITICAL: MJK Prints Storage Bucket Setup
-- =============================================================================
-- 
-- This SQL MUST be executed in the Supabase SQL Editor to fix PDF upload 500 errors
-- 
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard/project/hminnrncnrquogdwnpan/sql
-- 2. Copy and paste this entire SQL block
-- 3. Click "RUN" to execute
-- 4. Verify success with the SELECT statement at the bottom
--

-- Create storage bucket for PDF uploads (50MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mjk-prints-storage', 'mjk-prints-storage', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for file access
CREATE POLICY "Public read access to files" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow file uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow file updates" 
ON storage.objects FOR UPDATE 
TO public 
USING (bucket_id = 'mjk-prints-storage')
WITH CHECK (bucket_id = 'mjk-prints-storage');

CREATE POLICY "Allow file deletion" 
ON storage.objects FOR DELETE 
TO public 
USING (bucket_id = 'mjk-prints-storage');

-- Verification function
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
            THEN 'Bucket mjk-prints-storage exists and configured'::TEXT
            ELSE 'Bucket mjk-prints-storage not found'::TEXT
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
        'File size: 50MB, Types: PDF, JPEG, PNG, WebP'::TEXT;
    
    -- Check storage policies
    RETURN QUERY
    SELECT 
        'Storage Policies'::TEXT,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_policies 
                WHERE tablename = 'objects' 
                AND schemaname = 'storage'
                AND policyname LIKE '%file%'
            ) 
            THEN 'OK'::TEXT 
            ELSE 'MISSING'::TEXT 
        END,
        'RLS policies for bucket access'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION: Run this to confirm setup worked
-- =============================================================================

SELECT * FROM verify_storage_setup();

-- Also check bucket exists directly
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'mjk-prints-storage';

-- =============================================================================
-- SUCCESS INDICATORS:
-- =============================================================================
-- 
-- You should see:
-- 1. verify_storage_setup() returns 3 rows with status 'OK'
-- 2. storage.buckets query returns 1 row with bucket details
-- 3. No errors during execution
--
-- After this runs successfully:
-- - PDF upload API will work (no more 500 errors)
-- - Files can be uploaded to /api/upload/pdf
-- - Storage bucket is ready for production use
--