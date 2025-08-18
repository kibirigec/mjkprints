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
    
    try {
        // Run the verification function from the schema
        const { data, error } = await supabase.rpc('verify_database_setup');
        
        if (error) {
            console.error('❌ Verification function failed:', error.message);
            return false;
        }
        
        let allGood = true;
        
        
        data.forEach(result => {
            const status = result.status === 'OK' ? '✅' : '❌';
            
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
    
    try {
        // Test 1: Fetch products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .limit(3);
        
        if (productsError) {
            console.error('❌ Failed to fetch products:', productsError.message);
            return false;
        }
        
        
        // Test 2: Check storage bucket
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
        
        
        // Test 3: Test file_uploads table
        const { data: fileUploads, error: fileUploadsError } = await supabase
            .from('file_uploads')
            .select('*')
            .limit(1);
        
        if (fileUploadsError) {
            console.error('❌ Failed to query file_uploads table:', fileUploadsError.message);
            return false;
        }
        
        
        return true;
        
    } catch (err) {
        console.error('❌ Basic operations test failed:', err.message);
        return false;
    }
}

async function checkAPIEndpoints() {
    
    const apiTests = [
        { name: 'Products API', path: '/api/products' },
        { name: 'PDF Upload API', path: '/api/upload/pdf' },
        { name: 'Health Check API', path: '/api/health/system' }
    ];
    
    const baseUrl = 'http://localhost:3000';
    
    for (const test of apiTests) {
        try {
            
            const response = await fetch(`${baseUrl}${test.path}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
            } else {
            }
            
        } catch (err) {
        }
    }
}

async function main() {
    
    // Step 1: Verify database setup
    const dbSetupValid = await verifyDatabaseSetup();
    
    if (!dbSetupValid) {
        process.exit(1);
    }
    
    // Step 2: Test basic operations
    const operationsValid = await testBasicOperations();
    
    if (!operationsValid) {
        process.exit(1);
    }
    
    // Step 3: Check API endpoints (optional)
    await checkAPIEndpoints();
    
    // Success summary
    
    
}

// Run verification
main().catch(err => {
    console.error('❌ Verification script failed:', err.message);
    process.exit(1);
});