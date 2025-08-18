#!/usr/bin/env node
/**
 * Test Storage Connection for MJK Prints
 * 
 * This script tests the Supabase storage bucket connection
 * to verify the PDF upload fix is working.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testStorageConnection() {
    
    // Read environment variables
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local file not found');
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
    const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
        process.exit(1);
    }
    
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        // Test 1: Check if bucket exists
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('❌ Failed to list buckets:', bucketsError.message);
            return false;
        }
        
        const mjkBucket = buckets.find(bucket => bucket.id === 'mjk-prints-storage');
        if (!mjkBucket) {
            console.error('❌ Storage bucket "mjk-prints-storage" not found');
            return false;
        }
        
        
        // Test 2: Check bucket permissions
        const { data: files, error: listError } = await supabase.storage
            .from('mjk-prints-storage')
            .list();
        
        if (listError) {
            console.error('❌ Failed to list files in bucket:', listError.message);
            return false;
        }
        
        
        // Test 3: Verify database connection
        const { data: verifyData, error: verifyError } = await supabase
            .rpc('verify_storage_setup');
        
        if (verifyError) {
        } else {
            verifyData.forEach(row => {
            });
        }
        
        
        return true;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    testStorageConnection()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testStorageConnection };