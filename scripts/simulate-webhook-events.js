#!/usr/bin/env node

/**
 * Stripe Webhook Event Simulation Script
 * Simulates webhook events using Stripe CLI for testing
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

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
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runStripeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    log('cyan', `Running: stripe ${command} ${args.join(' ')}`);
    
    const process = spawn('stripe', [command, ...args], {
      stdio: 'inherit'
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkStripeCliInstalled() {
  try {
    await new Promise((resolve, reject) => {
      const process = spawn('stripe', ['--version'], {
        stdio: 'pipe'
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Stripe CLI not found'));
        }
      });
      
      process.on('error', () => {
        reject(new Error('Stripe CLI not found'));
      });
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function simulateCheckoutSessionCompleted() {
  log('blue', '\n🛒 Simulating checkout.session.completed event...');
  log('yellow', 'This simulates a successful payment completion');
  
  try {
    await runStripeCommand('trigger', [
      'checkout.session.completed',
      '--override', 'checkout.session.metadata.order_id=test_order_123',
      '--override', 'checkout.session.metadata.email=test@example.com'
    ]);
    log('green', '✅ Checkout session completed event triggered');
  } catch (error) {
    log('red', '❌ Failed to trigger checkout session completed:', error.message);
  }
}

async function simulatePaymentIntentSucceeded() {
  log('blue', '\n💳 Simulating payment_intent.succeeded event...');
  log('yellow', 'This simulates a successful payment processing');
  
  try {
    await runStripeCommand('trigger', ['payment_intent.succeeded']);
    log('green', '✅ Payment intent succeeded event triggered');
  } catch (error) {
    log('red', '❌ Failed to trigger payment intent succeeded:', error.message);
  }
}

async function simulatePaymentIntentFailed() {
  log('blue', '\n❌ Simulating payment_intent.payment_failed event...');
  log('yellow', 'This simulates a failed payment (e.g., declined card)');
  
  try {
    await runStripeCommand('trigger', [
      'payment_intent.payment_failed',
      '--override', 'payment_intent.last_payment_error.code=card_declined',
      '--override', 'payment_intent.last_payment_error.decline_code=generic_decline'
    ]);
    log('green', '✅ Payment intent failed event triggered');
  } catch (error) {
    log('red', '❌ Failed to trigger payment intent failed:', error.message);
  }
}

async function simulateCustomEvent(eventType) {
  log('blue', `\n🔧 Simulating custom event: ${eventType}...`);
  
  try {
    await runStripeCommand('trigger', [eventType]);
    log('green', `✅ ${eventType} event triggered`);
  } catch (error) {
    log('red', `❌ Failed to trigger ${eventType}:`, error.message);
  }
}

async function listRecentEvents() {
  log('blue', '\n📋 Listing recent Stripe events...');
  
  try {
    await runStripeCommand('events', ['list', '--limit', '10']);
  } catch (error) {
    log('red', '❌ Failed to list events:', error.message);
  }
}

async function showEventDetails(eventId) {
  log('blue', `\n🔍 Showing details for event: ${eventId}...`);
  
  try {
    await runStripeCommand('events', ['retrieve', eventId]);
  } catch (error) {
    log('red', '❌ Failed to retrieve event details:', error.message);
  }
}

function showUsage() {
  log('bold', '\n📖 Usage:');
  log('reset', 'npm run webhook:simulate [command]');
  log('reset', '\nAvailable commands:');
  log('reset', '  checkout    - Simulate checkout.session.completed');
  log('reset', '  success     - Simulate payment_intent.succeeded');
  log('reset', '  failed      - Simulate payment_intent.payment_failed');
  log('reset', '  all         - Run all simulation tests');
  log('reset', '  list        - List recent Stripe events');
  log('reset', '  custom      - Simulate custom event (requires event type)');
  log('reset', '  help        - Show this usage information');
  log('reset', '\nExamples:');
  log('cyan', '  npm run webhook:simulate checkout');
  log('cyan', '  npm run webhook:simulate all');
  log('cyan', '  npm run webhook:simulate custom customer.created');
}

async function runAllSimulations() {
  log('bold', '\n🚀 Running all webhook simulations...\n');
  
  await simulateCheckoutSessionCompleted();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
  
  await simulatePaymentIntentSucceeded();
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await simulatePaymentIntentFailed();
  
  log('green', '\n✅ All webhook simulations completed!');
  log('yellow', '\nCheck your webhook logs to verify events were received and processed.');
}

async function main() {
  const command = process.argv[2];
  const customEvent = process.argv[3];
  
  log('bold', '🎯 MJK Prints - Stripe Webhook Event Simulator\n');
  
  // Check if Stripe CLI is installed
  const cliInstalled = await checkStripeCliInstalled();
  if (!cliInstalled) {
    log('red', '❌ Stripe CLI is not installed or not in PATH');
    log('yellow', '\nInstallation instructions:');
    log('reset', 'macOS: brew install stripe/stripe-cli/stripe');
    log('reset', 'Linux: https://stripe.com/docs/stripe-cli#install');
    log('reset', 'Windows: https://stripe.com/docs/stripe-cli#install');
    process.exit(1);
  }

  log('green', '✅ Stripe CLI is available\n');

  // Check if webhook forwarding is running
  log('yellow', '⚠️  Make sure webhook forwarding is active:');
  log('cyan', '   npm run webhook:dev');
  log('reset', '   (or: stripe listen --forward-to localhost:3000/api/webhooks/stripe)\n');

  switch (command) {
    case 'checkout':
      await simulateCheckoutSessionCompleted();
      break;
      
    case 'success':
      await simulatePaymentIntentSucceeded();
      break;
      
    case 'failed':
      await simulatePaymentIntentFailed();
      break;
      
    case 'all':
      await runAllSimulations();
      break;
      
    case 'list':
      await listRecentEvents();
      break;
      
    case 'custom':
      if (!customEvent) {
        log('red', '❌ Custom event type required');
        log('yellow', 'Usage: npm run webhook:simulate custom event_type');
        log('yellow', 'Example: npm run webhook:simulate custom customer.created');
      } else {
        await simulateCustomEvent(customEvent);
      }
      break;
      
    case 'help':
    default:
      showUsage();
      break;
  }

  log('blue', '\n💡 Pro Tips:');
  log('reset', '- Monitor webhook processing in your development server logs');
  log('reset', '- Check Stripe CLI output for event delivery status');
  log('reset', '- Use "npm run webhook:status" to verify webhook endpoint health');
  log('reset', '- Events are sent to your local development server at localhost:3000');
}

// Run the simulator
main().catch(error => {
  log('red', '💥 Simulation error:', error.message);
  process.exit(1);
});