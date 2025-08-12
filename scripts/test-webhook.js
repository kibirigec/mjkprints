#!/usr/bin/env node

/**
 * Stripe Webhook Endpoint Testing Script
 * Tests the webhook endpoint availability and basic functionality
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const WEBHOOK_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const WEBHOOK_ENDPOINT = `${WEBHOOK_URL}/api/webhooks/stripe`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testWebhookEndpoint() {
  log('blue', '🔍 Testing Stripe Webhook Endpoint...\n');

  // Test 1: Check if endpoint accepts POST requests
  log('yellow', '1. Testing webhook endpoint availability...');
  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'webhook availability' })
    });

    if (response.status === 400) {
      log('green', '   ✅ Webhook endpoint is accessible and properly rejects invalid requests');
    } else if (response.status === 500) {
      const text = await response.text();
      if (text.includes('Webhook secret not configured')) {
        log('yellow', '   ⚠️  Webhook endpoint accessible but STRIPE_WEBHOOK_SECRET not configured');
        log('yellow', '      Run: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
        log('yellow', '      Then copy the webhook secret to your .env.local file');
      } else {
        log('red', '   ❌ Webhook endpoint error:', text);
      }
    } else {
      log('red', `   ❌ Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    log('red', '   ❌ Failed to reach webhook endpoint:', error.message);
    log('yellow', '      Make sure your development server is running (npm run dev)');
    return false;
  }

  // Test 2: Check if endpoint rejects GET requests
  log('yellow', '\n2. Testing method validation...');
  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'GET'
    });

    if (response.status === 405) {
      log('green', '   ✅ Webhook properly rejects GET requests');
    } else {
      log('red', `   ❌ Unexpected response to GET request: ${response.status}`);
    }
  } catch (error) {
    log('red', '   ❌ Error testing GET request:', error.message);
  }

  // Test 3: Check environment variables
  log('yellow', '\n3. Checking environment configuration...');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];

  const optionalVars = [
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL'
  ];

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      if (varName === 'STRIPE_SECRET_KEY' && process.env[varName].startsWith('sk_')) {
        log('green', `   ✅ ${varName} is configured`);
      } else if (varName === 'STRIPE_WEBHOOK_SECRET' && process.env[varName].startsWith('whsec_')) {
        log('green', `   ✅ ${varName} is configured`);
      } else if (varName === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' && process.env[varName].startsWith('pk_')) {
        log('green', `   ✅ ${varName} is configured`);
      } else {
        log('yellow', `   ⚠️  ${varName} is set but may have incorrect format`);
      }
    } else {
      log('red', `   ❌ ${varName} is not configured`);
    }
  });

  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log('green', `   ✅ ${varName} is configured (optional)`);
    } else {
      log('yellow', `   ⚠️  ${varName} is not configured (optional - graceful degradation)`);
    }
  });

  return true;
}

async function testDatabaseConnection() {
  log('yellow', '\n4. Testing database connection...');
  
  try {
    const response = await fetch(`${WEBHOOK_URL}/api/health/system`);
    const data = await response.json();
    
    if (data.database === 'connected') {
      log('green', '   ✅ Database connection is working');
    } else {
      log('red', '   ❌ Database connection failed');
    }
  } catch (error) {
    log('yellow', '   ⚠️  Could not test database connection (health endpoint may not exist)');
  }
}

async function provideDevelopmentInstructions() {
  log('blue', '\n📋 Development Setup Instructions:\n');
  
  log('reset', '1. Install Stripe CLI:');
  log('reset', '   macOS: brew install stripe/stripe-cli/stripe');
  log('reset', '   Other: https://stripe.com/docs/stripe-cli\n');
  
  log('reset', '2. Authenticate with Stripe:');
  log('reset', '   stripe login\n');
  
  log('reset', '3. Start webhook forwarding:');
  log('reset', '   npm run webhook:dev');
  log('reset', '   (or: stripe listen --forward-to localhost:3000/api/webhooks/stripe)\n');
  
  log('reset', '4. Copy webhook secret from CLI output to .env.local:');
  log('reset', '   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here\n');
  
  log('reset', '5. Test webhook with Stripe CLI:');
  log('reset', '   stripe trigger checkout.session.completed\n');
  
  log('green', 'For complete setup guide, see: STRIPE_WEBHOOKS_GUIDE.md');
}

async function main() {
  log('bold', '🚀 MJK Prints - Stripe Webhook Testing Tool\n');
  
  const endpointWorking = await testWebhookEndpoint();
  await testDatabaseConnection();
  
  if (endpointWorking) {
    log('green', '\n✅ Webhook endpoint is properly configured and accessible!');
    log('blue', '\nNext steps:');
    log('reset', '- Start webhook forwarding: npm run webhook:dev');
    log('reset', '- Test webhook events: npm run webhook:simulate');
    log('reset', '- Monitor webhook status: npm run webhook:status');
  } else {
    log('red', '\n❌ Webhook endpoint needs configuration');
    await provideDevelopmentInstructions();
  }
}

// Run the test
main().catch(error => {
  log('red', '💥 Test script error:', error.message);
  process.exit(1);
});