#!/usr/bin/env node
/**
 * Deploy Schema Script for MJK Prints
 * 
 * This script applies the database schema changes including the critical
 * storage bucket setup needed for PDF uploads.
 * 
 * Usage:
 *   node scripts/deploy-schema.js
 * 
 * Prerequisites:
 *   - .env.local file with Supabase credentials
 *   - Network access to Supabase instance
 */

const fs = require('fs');
const path = require('path');

async function deploySchema() {
    
    // Check if .env.local exists
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
        if (supabaseUrl) {
        }
    } else {
    }
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250728150935_initial_schema_with_storage.sql');
    
    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Manual deployment instructions
    
    // Create a simplified deployment script
    const deploymentSql = `
-- MJK Prints Storage Bucket Quick Setup
-- Execute this in Supabase SQL Editor if you only need the storage bucket

-- Create storage bucket for PDF uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('mjk-prints-storage', 'mjk-prints-storage', true, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies
CREATE POLICY "Public read access to files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'mjk-prints-storage');
CREATE POLICY "Allow file uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'mjk-prints-storage');
CREATE POLICY "Allow file updates" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'mjk-prints-storage') WITH CHECK (bucket_id = 'mjk-prints-storage');
CREATE POLICY "Allow file deletion" ON storage.objects FOR DELETE TO public USING (bucket_id = 'mjk-prints-storage');

-- Verification function
CREATE OR REPLACE FUNCTION verify_storage_setup()
RETURNS TABLE (component TEXT, status TEXT, details TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 'Storage Bucket'::TEXT, 
        CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'mjk-prints-storage') THEN 'OK'::TEXT ELSE 'MISSING'::TEXT END,
        'Storage bucket for PDF uploads'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Test the setup
SELECT * FROM verify_storage_setup();
`;
    
    // Write quick deployment file
    const quickDeployPath = path.join(__dirname, 'quick-storage-setup.sql');
    fs.writeFileSync(quickDeployPath, deploymentSql);
}

// Run if called directly
if (require.main === module) {
    deploySchema().catch(console.error);
}

module.exports = { deploySchema };