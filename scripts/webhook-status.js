#!/usr/bin/env node

/**
 * Stripe Webhook Status Monitoring Script
 * Monitors webhook endpoint health and recent event delivery
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
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
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

function log(color, message) {
}

function formatTime(timestamp) {
  return new Date(timestamp * 1000).toLocaleString();
}

function runStripeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('stripe', [command, ...args], {
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkWebhookEndpointHealth() {
  log('blue', '🏥 Checking webhook endpoint health...\n');
  
  try {
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: 'health check' }),
      timeout: 5000
    });

    if (response.status === 400 || response.status === 500) {
      log('green', '✅ Webhook endpoint is responding');
      log('dim', `   Response status: ${response.status}`);
      
      const responseText = await response.text();
      if (responseText.includes('Webhook secret not configured')) {
        log('yellow', '⚠️  Webhook secret not configured');
        return 'needs_setup';
      }
      return 'healthy';
    } else {
      log('yellow', `⚠️  Unexpected response status: ${response.status}`);
      return 'unexpected';
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('red', '❌ Cannot connect to webhook endpoint');
      log('yellow', '   Make sure your development server is running (npm run dev)');
    } else if (error.name === 'AbortError') {
      log('red', '❌ Webhook endpoint timeout (>5 seconds)');
    } else {
      log('red', '❌ Webhook endpoint error:', error.message);
    }
    return 'unhealthy';
  }
}

async function checkStripeCliStatus() {
  log('blue', '\n🔧 Checking Stripe CLI status...\n');
  
  try {
    // Check if Stripe CLI is installed
    await runStripeCommand('--version');
    log('green', '✅ Stripe CLI is installed');
  } catch (error) {
    log('red', '❌ Stripe CLI is not installed or not accessible');
    log('yellow', '   Install with: brew install stripe/stripe-cli/stripe');
    return false;
  }

  try {
    // Check if authenticated
    const output = await runStripeCommand('config', ['--list']);
    if (output.includes('test_mode_api_key') || output.includes('live_mode_api_key')) {
      log('green', '✅ Stripe CLI is authenticated');
    } else {
      log('yellow', '⚠️  Stripe CLI may not be authenticated');
      log('yellow', '   Run: stripe login');
    }
  } catch (error) {
    log('yellow', '⚠️  Could not check Stripe CLI authentication status');
  }

  return true;
}

async function getRecentWebhookEvents() {
  log('blue', '\n📊 Recent webhook events...\n');
  
  try {
    const output = await runStripeCommand('events', ['list', '--limit', '5']);
    
    // Parse the output to extract event information
    const lines = output.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      log('yellow', '⚠️  No recent events found');
      return;
    }

    log('cyan', 'Recent Events:');
    lines.slice(1, 6).forEach((line, index) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 3) {
        const eventId = parts[0];
        const eventType = parts[1];
        const created = parts[2];
        log('reset', `${index + 1}. ${eventType} (${eventId})`);
        log('dim', `   Created: ${created}`);
      }
    });
    
  } catch (error) {
    log('red', '❌ Could not retrieve recent events:', error.message);
  }
}

async function checkEnvironmentConfiguration() {
  log('blue', '\n⚙️  Environment configuration...\n');
  
  const config = {
    'STRIPE_SECRET_KEY': {
      present: !!process.env.STRIPE_SECRET_KEY,
      valid: process.env.STRIPE_SECRET_KEY?.startsWith('sk_'),
      required: true
    },
    'STRIPE_WEBHOOK_SECRET': {
      present: !!process.env.STRIPE_WEBHOOK_SECRET,
      valid: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
      required: true
    },
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
      present: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      valid: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'),
      required: true
    },
    'SENDGRID_API_KEY': {
      present: !!process.env.SENDGRID_API_KEY,
      valid: process.env.SENDGRID_API_KEY?.startsWith('SG.'),
      required: false
    },
    'SENDGRID_FROM_EMAIL': {
      present: !!process.env.SENDGRID_FROM_EMAIL,
      valid: process.env.SENDGRID_FROM_EMAIL?.includes('@'),
      required: false
    }
  };

  Object.entries(config).forEach(([key, info]) => {
    if (info.present && info.valid) {
      log('green', `✅ ${key} - configured and valid`);
    } else if (info.present && !info.valid) {
      log('yellow', `⚠️  ${key} - present but invalid format`);
    } else if (info.required) {
      log('red', `❌ ${key} - missing (required)`);
    } else {
      log('dim', `○  ${key} - not configured (optional)`);
    }
  });
}

async function testWebhookDelivery() {
  log('blue', '\n🚀 Testing webhook delivery...\n');
  log('yellow', 'Triggering a test event to verify webhook processing...');
  
  try {
    await runStripeCommand('trigger', ['checkout.session.completed']);
    log('green', '✅ Test event triggered successfully');
    log('cyan', '   Check your development server logs for webhook processing');
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    log('red', '❌ Failed to trigger test event:', error.message);
  }
}

async function showWebhookForwardingStatus() {
  log('blue', '\n🔀 Webhook forwarding status...\n');
  
  try {
    const output = await runStripeCommand('listen', ['--list']);
    
    if (output.includes('localhost:3000')) {
      log('green', '✅ Webhook forwarding appears to be configured for localhost:3000');
    } else {
      log('yellow', '⚠️  No active webhook forwarding found');
      log('cyan', '   Start forwarding with: npm run webhook:dev');
    }
  } catch (error) {
    log('yellow', '⚠️  Could not check webhook forwarding status');
    log('cyan', '   Start forwarding with: npm run webhook:dev');
  }
}

function showRecommendations(endpointHealth) {
  log('blue', '\n💡 Recommendations:\n');
  
  if (endpointHealth === 'unhealthy') {
    log('yellow', '1. Start your development server: npm run dev');
    log('yellow', '2. Verify the server is running on port 3000');
  }
  
  if (endpointHealth === 'needs_setup') {
    log('yellow', '1. Start webhook forwarding: npm run webhook:dev');
    log('yellow', '2. Copy the webhook secret to your .env.local file');
  }
  
  log('cyan', '• Test webhook events: npm run webhook:simulate');
  log('cyan', '• View comprehensive guide: STRIPE_WEBHOOKS_GUIDE.md');
  log('cyan', '• Monitor in real-time: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
}

async function continuousMonitoring() {
  log('bold', '🔄 Starting continuous monitoring (press Ctrl+C to stop)...\n');
  
  const monitorInterval = setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString();
    log('dim', `\n--- Status Check at ${timestamp} ---`);
    
    const health = await checkWebhookEndpointHealth();
    
    if (health === 'healthy') {
      log('green', '✅ Webhook endpoint healthy');
    } else {
      log('red', `❌ Webhook endpoint status: ${health}`);
    }
    
    log('dim', '--- End Status Check ---');
  }, 30000); // Check every 30 seconds

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(monitorInterval);
    log('yellow', '\n\n👋 Monitoring stopped. Goodbye!');
    process.exit(0);
  });
}

async function main() {
  const command = process.argv[2];
  
  log('bold', '📊 MJK Prints - Webhook Status Monitor\n');
  
  if (command === 'monitor') {
    await continuousMonitoring();
    return;
  }
  
  // Run all status checks
  const endpointHealth = await checkWebhookEndpointHealth();
  const cliAvailable = await checkStripeCliStatus();
  
  await checkEnvironmentConfiguration();
  
  if (cliAvailable) {
    await showWebhookForwardingStatus();
    await getRecentWebhookEvents();
    
    if (endpointHealth === 'healthy' && command === 'test') {
      await testWebhookDelivery();
    }
  }
  
  showRecommendations(endpointHealth);
  
  log('blue', '\n📖 Available commands:');
  log('reset', '  npm run webhook:status        - Run status checks');
  log('reset', '  npm run webhook:status test   - Run status checks + test delivery');
  log('reset', '  npm run webhook:status monitor - Continuous monitoring');
}

// Run the status monitor
main().catch(error => {
  log('red', '💥 Status monitor error:', error.message);
  process.exit(1);
});