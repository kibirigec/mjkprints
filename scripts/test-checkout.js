#!/usr/bin/env node

/**
 * Checkout API Testing Script
 * Tests the checkout session creation API to verify database fixes
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config({ path: '.env.local' });

const CHECKOUT_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const CHECKOUT_API = `${CHECKOUT_URL}/api/checkout/session`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
}

// Sample test data - using real products from the database
const testCheckoutData = {
  items: [
    {
      id: "d79f8300-ea32-4533-b9b8-3665e2e1706b",
      title: "Big Tree Flyer",
      price: 19.41,
      quantity: 1,
      image: "https://hminnrncnrquogdwnpan.supabase.co/storage/v1/object/public/mjk-prints-storage/previews/b887d616-2948-450e-8201-d3c7e03126a8/page-1-medium.jpg"
    }
  ],
  email: "test@mjkprints.com",
  billingDetails: {
    name: "Test Customer",
    address: {
      line1: "123 Test St",
      city: "Test City",
      state: "TC",
      postal_code: "12345",
      country: "US"
    }
  }
};

async function testCheckoutSession() {
  log('bold', '🛒 MJK Prints - Checkout API Testing Tool\n');
  
  log('blue', '🔍 Testing checkout session creation...\n');
  
  try {
    log('cyan', '1. Sending checkout request...');
    
    const response = await fetch(CHECKOUT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCheckoutData),
      timeout: 15000
    });
    
    const responseText = await response.text();
    
    log('cyan', `   Response status: ${response.status}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      
      log('green', '✅ Checkout session created successfully!');
      log('cyan', '   Order ID: ' + data.orderId);
      log('cyan', '   Session ID: ' + data.sessionId);
      log('cyan', '   Stripe URL: ' + data.sessionUrl);
      
      log('\ngreen', '🎉 Database RLS policies are working correctly!');
      log('blue', '\nNext steps:');
      log('reset', '1. Test the full payment flow by visiting the Stripe URL');
      log('reset', '2. Use test card: 4242 4242 4242 4242');
      log('reset', '3. Check webhook processing after payment');
      
      return true;
      
    } else {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText };
      }
      
      log('red', '❌ Checkout session creation failed');
      log('cyan', `   Status: ${response.status}`);
      log('cyan', `   Error: ${errorData.error || 'Unknown error'}`);
      
      if (errorData.details) {
        log('cyan', `   Details: ${errorData.details}`);
      }
      
      if (response.status === 400) {
        log('yellow', '\n⚠️  This likely means the database RLS policies still need to be updated.');
        log('yellow', '   Please run the SQL script in Supabase SQL Editor.');
      } else if (response.status === 500) {
        log('yellow', '\n⚠️  Server error - check application logs for details.');
      }
      
      return false;
    }
    
  } catch (error) {
    log('red', '❌ Network error connecting to checkout API');
    log('cyan', `   Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      log('yellow', '\n⚠️  Make sure your development server is running:');
      log('cyan', '   npm run dev');
    }
    
    return false;
  }
}

async function testDatabaseHealth() {
  log('blue', '\n🏥 Testing database health...\n');
  
  try {
    const response = await fetch(`${CHECKOUT_URL}/api/health/system`, {
      timeout: 10000
    });
    
    if (response.ok) {
      const data = await response.json();
      
      log('cyan', 'Database Status:');
      log(data.checks.database.connection ? 'green' : 'red', 
          `   Connection: ${data.checks.database.connection ? '✅ Working' : '❌ Failed'}`);
      log(data.checks.database.permissions.read ? 'green' : 'red', 
          `   Read Permissions: ${data.checks.database.permissions.read ? '✅ Working' : '❌ Failed'}`);
      log(data.checks.database.permissions.write ? 'green' : 'red', 
          `   Write Permissions: ${data.checks.database.permissions.write ? '✅ Working' : '❌ Failed'}`);
      
      log('\ncyan', 'Storage Status:');
      log(data.checks.storage.canUpload ? 'green' : 'red',
          `   Upload Test: ${data.checks.storage.canUpload ? '✅ Working' : '❌ Failed'}`);
      
      return data.checks.database.permissions.write && data.checks.storage.canUpload;
      
    } else {
      log('red', '❌ Health check API failed');
      return false;
    }
    
  } catch (error) {
    log('red', '❌ Health check failed:', error.message);
    return false;
  }
}

async function main() {
  // Test database health first
  const dbHealthy = await testDatabaseHealth();
  
  if (!dbHealthy) {
    log('yellow', '\n⚠️  Database or storage issues detected. Please apply the RLS policy fix first.');
    log('blue', '\nTo fix:');
    log('reset', '1. Open Supabase SQL Editor');
    log('reset', '2. Run the script from DATABASE_FIX_INSTRUCTIONS.md');
    log('reset', '3. Run this test again: npm run test:checkout');
    return;
  }
  
  // Test checkout session creation
  const checkoutWorking = await testCheckoutSession();
  
  if (checkoutWorking) {
    log('\ngreen', '🎊 Payment system is fully operational!');
  } else {
    log('\nred', '💥 Checkout system needs attention.');
  }
}

// Handle command line execution
if (process.argv[1].endsWith('test-checkout.js')) {
  main().catch(error => {
    log('red', '💥 Test error:', error.message);
    process.exit(1);
  });
}

export default { testCheckoutSession, testDatabaseHealth };