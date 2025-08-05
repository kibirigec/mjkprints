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
    console.log('🧪 Testing MJK Prints Storage Connection');
    console.log('========================================');
    
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
    
    console.log('✅ Environment variables loaded');
    console.log(`   Project: ${supabaseUrl}`);
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        // Test 1: Check if bucket exists
        console.log('\n📋 Test 1: Checking storage bucket...');
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('❌ Failed to list buckets:', bucketsError.message);
            return false;
        }
        
        const mjkBucket = buckets.find(bucket => bucket.id === 'mjk-prints-storage');
        if (!mjkBucket) {
            console.error('❌ Storage bucket "mjk-prints-storage" not found');
            console.log('   Available buckets:', buckets.map(b => b.id).join(', '));
            console.log('   Please run the SQL setup script first!');
            return false;
        }
        
        console.log('✅ Storage bucket "mjk-prints-storage" exists');
        console.log(`   Public: ${mjkBucket.public}`);
        console.log(`   File size limit: ${mjkBucket.file_size_limit ? (mjkBucket.file_size_limit / 1024 / 1024).toFixed(1) + 'MB' : 'Not set'}`);
        
        // Test 2: Check bucket permissions
        console.log('\n📋 Test 2: Testing bucket permissions...');
        const { data: files, error: listError } = await supabase.storage
            .from('mjk-prints-storage')
            .list();
        
        if (listError) {
            console.error('❌ Failed to list files in bucket:', listError.message);
            return false;
        }
        
        console.log('✅ Can list files in bucket');
        console.log(`   Current files: ${files.length}`);
        
        // Test 3: Verify database connection
        console.log('\n📋 Test 3: Testing database connection...');
        const { data: verifyData, error: verifyError } = await supabase
            .rpc('verify_storage_setup');
        
        if (verifyError) {
            console.log('⚠️  Storage verification function not available');
            console.log('   This is normal if you only ran the quick setup');
        } else {
            console.log('✅ Database verification successful:');
            verifyData.forEach(row => {
                console.log(`   ${row.component}: ${row.status} - ${row.details}`);
            });
        }
        
        console.log('\n🎉 Storage Connection Test Results');
        console.log('================================');
        console.log('✅ Storage bucket exists and is accessible');
        console.log('✅ Bucket permissions are configured');
        console.log('✅ PDF upload API should now work correctly');
        console.log('');
        console.log('🚀 Next steps:');
        console.log('   1. Test PDF upload via /api/upload/pdf');
        console.log('   2. Verify file storage in Supabase dashboard');
        console.log('   3. Check PDF preview generation');
        
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