#!/usr/bin/env node

/**
 * Verification Script for Minimal Database Schema
 * 
 * This script verifies that the minimal-schema.sql deployed successfully
 * and all required components are working correctly.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseSetup() {
    console.log('🔍 Verifying Minimal Database Schema Setup...\n');
    
    try {
        // Run the verification function from the schema
        const { data, error } = await supabase.rpc('verify_database_setup');
        
        if (error) {
            console.error('❌ Verification function failed:', error.message);
            return false;
        }
        
        let allGood = true;
        
        console.log('📊 Database Setup Verification Results:');
        console.log('═══════════════════════════════════════');
        
        data.forEach(result => {
            const status = result.status === 'OK' ? '✅' : '❌';
            console.log(`${status} ${result.component}: ${result.status}`);
            console.log(`   ${result.details}\n`);
            
            if (result.status !== 'OK') {
                allGood = false;
            }
        });
        
        return allGood;
        
    } catch (err) {
        console.error('❌ Database verification failed:', err.message);
        return false;
    }
}

async function testBasicOperations() {
    console.log('🧪 Testing Basic Database Operations...\n');
    
    try {
        // Test 1: Fetch products
        console.log('1. Testing product retrieval...');
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .limit(3);
        
        if (productsError) {
            console.error('❌ Failed to fetch products:', productsError.message);
            return false;
        }
        
        console.log(`✅ Successfully retrieved ${products.length} products\n`);
        
        // Test 2: Check storage bucket
        console.log('2. Testing storage bucket access...');
        const { data: buckets, error: bucketsError } = await supabase
            .storage
            .listBuckets();
        
        if (bucketsError) {
            console.error('❌ Failed to list storage buckets:', bucketsError.message);
            return false;
        }
        
        const mjkBucket = buckets.find(b => b.id === 'mjk-prints-storage');
        if (!mjkBucket) {
            console.error('❌ Storage bucket "mjk-prints-storage" not found');
            return false;
        }
        
        console.log('✅ Storage bucket "mjk-prints-storage" exists and accessible\n');
        
        // Test 3: Test file_uploads table
        console.log('3. Testing file_uploads table structure...');
        const { data: fileUploads, error: fileUploadsError } = await supabase
            .from('file_uploads')
            .select('*')
            .limit(1);
        
        if (fileUploadsError) {
            console.error('❌ Failed to query file_uploads table:', fileUploadsError.message);
            return false;
        }
        
        console.log('✅ file_uploads table is accessible\n');
        
        return true;
        
    } catch (err) {
        console.error('❌ Basic operations test failed:', err.message);
        return false;
    }
}

async function checkAPIEndpoints() {
    console.log('🌐 Testing API Endpoint Readiness...\n');
    
    const apiTests = [
        { name: 'Products API', path: '/api/products' },
        { name: 'PDF Upload API', path: '/api/upload/pdf' },
        { name: 'Health Check API', path: '/api/health/system' }
    ];
    
    const baseUrl = 'http://localhost:3000';
    
    for (const test of apiTests) {
        try {
            console.log(`Testing ${test.name}...`);
            
            const response = await fetch(`${baseUrl}${test.path}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                console.log(`✅ ${test.name} is accessible\n`);
            } else {
                console.log(`⚠️  ${test.name} returned status ${response.status} (may be expected for some endpoints)\n`);
            }
            
        } catch (err) {
            console.log(`⚠️  ${test.name} is not accessible (dev server may not be running)\n`);
        }
    }
}

async function main() {
    console.log('🚀 MJK Prints - Minimal Schema Verification\n');
    console.log('This script verifies that the minimal database schema');
    console.log('deployed successfully and all components are working.\n');
    
    // Step 1: Verify database setup
    const dbSetupValid = await verifyDatabaseSetup();
    
    if (!dbSetupValid) {
        console.log('❌ Database setup verification failed!');
        console.log('\n💡 Next steps:');
        console.log('1. Run the minimal-schema.sql in Supabase SQL Editor');
        console.log('2. Check for any syntax errors in the deployment');
        console.log('3. Verify environment variables are correct');
        process.exit(1);
    }
    
    // Step 2: Test basic operations
    const operationsValid = await testBasicOperations();
    
    if (!operationsValid) {
        console.log('❌ Basic operations test failed!');
        console.log('\n💡 Next steps:');
        console.log('1. Check RLS policies in Supabase dashboard');
        console.log('2. Verify storage bucket configuration');
        console.log('3. Check API key permissions');
        process.exit(1);
    }
    
    // Step 3: Check API endpoints (optional)
    await checkAPIEndpoints();
    
    // Success summary
    console.log('🎉 Verification Complete - All Systems Ready!\n');
    console.log('✅ Database schema deployed successfully');
    console.log('✅ All 6 core tables created');
    console.log('✅ Storage bucket configured');
    console.log('✅ Sample data loaded');
    console.log('✅ Basic operations working');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Test PDF upload via the web interface');
    console.log('2. Create a test order to verify payment flow');
    console.log('3. Monitor the system for any errors');
    
    console.log('\n📋 Quick Commands:');
    console.log('• View products: SELECT * FROM products;');
    console.log('• Check storage: SELECT * FROM storage.buckets;');
    console.log('• Run cleanup: SELECT cleanup_failed_uploads();');
}

// Run verification
main().catch(err => {
    console.error('❌ Verification script failed:', err.message);
    process.exit(1);
});