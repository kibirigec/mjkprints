#!/usr/bin/env node

/**
 * Stripe Webhook Setup Assistant
 * Guides through webhook setup for both development and production
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import readline from 'readline';

// Load environment variables
config({ path: '.env.local' });

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
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

async function checkStripeCliInstalled() {
  try {
    await runStripeCommand('--version');
    return true;
  } catch (error) {
    return false;
  }
}

async function installStripeCliInstructions() {
  log('red', '❌ Stripe CLI is not installed\n');
  log('blue', '📖 Installation Instructions:\n');
  
  const platform = process.platform;
  
  if (platform === 'darwin') {
    log('cyan', 'macOS Installation:');
    log('reset', '  brew install stripe/stripe-cli/stripe\n');
  } else if (platform === 'linux') {
    log('cyan', 'Linux Installation:');
    log('reset', '1. wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz');
    log('reset', '2. tar -xvf stripe_X.X.X_linux_x86_64.tar.gz');
    log('reset', '3. sudo mv stripe /usr/local/bin\n');
  } else {
    log('cyan', 'Windows Installation:');
    log('reset', 'Download from: https://github.com/stripe/stripe-cli/releases\n');
  }
  
  log('yellow', 'After installation, run this script again: npm run webhook:setup');
  return false;
}

async function authenticateStripeCli() {
  log('blue', '\n🔐 Authenticating with Stripe...\n');
  
  try {
    // Check if already authenticated
    const output = await runStripeCommand('config', ['--list']);
    if (output.includes('test_mode_api_key') || output.includes('live_mode_api_key')) {
      log('green', '✅ Stripe CLI is already authenticated');
      return true;
    }
  } catch (error) {
    // Continue with authentication
  }

  log('yellow', 'Opening browser for Stripe authentication...');
  log('cyan', 'If browser doesn\'t open, manually run: stripe login\n');
  
  try {
    await runStripeCommand('login');
    log('green', '✅ Successfully authenticated with Stripe');
    return true;
  } catch (error) {
    log('red', '❌ Authentication failed:', error.message);
    return false;
  }
}

async function setupDevelopmentWebhook() {
  log('blue', '\n🛠  Setting up development webhook...\n');
  
  const answer = await ask('Do you want to set up webhook forwarding for development? (y/n): ');
  
  if (answer.toLowerCase() !== 'y') {
    log('yellow', 'Skipping development webhook setup');
    return;
  }

  log('cyan', '\nStarting webhook forwarding...');
  log('yellow', 'This will start the webhook listener. Press Ctrl+C when you see the webhook secret.');
  log('yellow', 'Copy the webhook secret (whsec_...) from the output below:\n');
  
  try {
    // Start webhook listener but don't wait for it to complete
    const webhookProcess = spawn('stripe', [
      'listen', 
      '--forward-to', 
      'localhost:3000/api/webhooks/stripe'
    ], {
      stdio: 'inherit'
    });

    // Let it run for a few seconds to show the secret
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const secret = await ask('\nEnter the webhook secret (whsec_...): ');
    
    // Kill the webhook process
    webhookProcess.kill();
    
    if (secret && secret.startsWith('whsec_')) {
      await updateEnvFile('STRIPE_WEBHOOK_SECRET', secret);
      log('green', '✅ Webhook secret saved to .env.local');
      
      log('\n📋 To start webhook forwarding later, use:');
      log('cyan', '  npm run webhook:dev');
      log('reset', '  (or: stripe listen --forward-to localhost:3000/api/webhooks/stripe)');
    } else {
      log('red', '❌ Invalid webhook secret format');
    }
    
  } catch (error) {
    log('red', '❌ Webhook setup failed:', error.message);
  }
}

async function updateEnvFile(key, value) {
  const envPath = '.env.local';
  let envContent = '';
  
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }
  
  const lines = envContent.split('\n');
  let found = false;
  
  // Update existing key or add new one
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(`${key}=${value}`);
  }
  
  writeFileSync(envPath, lines.join('\n'));
}

async function checkCurrentConfiguration() {
  log('blue', '\n⚙️  Current Configuration:\n');
  
  const config = {
    'STRIPE_SECRET_KEY': {
      present: !!process.env.STRIPE_SECRET_KEY,
      valid: process.env.STRIPE_SECRET_KEY?.startsWith('sk_'),
      value: process.env.STRIPE_SECRET_KEY ? `${process.env.STRIPE_SECRET_KEY.substring(0, 10)}...` : 'Not set'
    },
    'STRIPE_WEBHOOK_SECRET': {
      present: !!process.env.STRIPE_WEBHOOK_SECRET,
      valid: process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'),
      value: process.env.STRIPE_WEBHOOK_SECRET ? `${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 12)}...` : 'Not set'
    },
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
      present: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      valid: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'),
      value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 10)}...` : 'Not set'
    }
  };

  Object.entries(config).forEach(([key, info]) => {
    if (info.present && info.valid) {
      log('green', `✅ ${key}: ${info.value}`);
    } else if (info.present && !info.valid) {
      log('yellow', `⚠️  ${key}: ${info.value} (invalid format)`);
    } else {
      log('red', `❌ ${key}: Not configured`);
    }
  });
}

async function setupProductionWebhook() {
  log('blue', '\n🚀 Production Webhook Setup Guide\n');
  
  const answer = await ask('Do you want to see production webhook setup instructions? (y/n): ');
  
  if (answer.toLowerCase() !== 'y') {
    return;
  }

  log('cyan', '\n📋 Production Webhook Setup Steps:\n');
  
  log('reset', '1. Go to your Stripe Dashboard:');
  log('blue', '   https://dashboard.stripe.com/webhooks\n');
  
  log('reset', '2. Click "Add endpoint"\n');
  
  log('reset', '3. Enter your production webhook URL:');
  log('cyan', '   https://yourdomain.com/api/webhooks/stripe\n');
  
  log('reset', '4. Select these events to send:');
  log('yellow', '   ✓ checkout.session.completed');
  log('yellow', '   ✓ payment_intent.succeeded');
  log('yellow', '   ✓ payment_intent.payment_failed\n');
  
  log('reset', '5. Click "Add endpoint"\n');
  
  log('reset', '6. Click on the newly created endpoint\n');
  
  log('reset', '7. In "Signing secret" section, click "Reveal"\n');
  
  log('reset', '8. Copy the webhook secret (starts with whsec_)\n');
  
  log('reset', '9. Add to your production environment variables:');
  log('cyan', '   STRIPE_WEBHOOK_SECRET=whsec_your_production_secret\n');
  
  log('green', '✅ Your production webhook will be ready to receive events!');
}

function showNextSteps() {
  log('blue', '\n🎯 Next Steps:\n');
  
  log('cyan', '1. Test your webhook setup:');
  log('reset', '   npm run webhook:test\n');
  
  log('cyan', '2. Start webhook forwarding:');
  log('reset', '   npm run webhook:dev\n');
  
  log('cyan', '3. Simulate webhook events:');
  log('reset', '   npm run webhook:simulate\n');
  
  log('cyan', '4. Monitor webhook status:');
  log('reset', '   npm run webhook:status\n');
  
  log('cyan', '5. Read the complete guide:');
  log('reset', '   STRIPE_WEBHOOKS_GUIDE.md\n');
  
  log('green', '🎉 Your webhook setup is ready for testing!');
}

function showWelcome() {
  log('bold', '🔧 MJK Prints - Stripe Webhook Setup Assistant\n');
  log('reset', 'This script will help you set up Stripe webhooks for both development and production.\n');
  
  log('blue', 'What this script does:');
  log('reset', '• Checks for Stripe CLI installation');
  log('reset', '• Authenticates with your Stripe account');
  log('reset', '• Sets up development webhook forwarding');
  log('reset', '• Provides production setup guidance');
  log('reset', '• Configures environment variables\n');
}

async function main() {
  showWelcome();
  
  // Check current configuration first
  await checkCurrentConfiguration();
  
  // Check if Stripe CLI is installed
  const cliInstalled = await checkStripeCliInstalled();
  if (!cliInstalled) {
    await installStripeCliInstructions();
    rl.close();
    return;
  }
  
  log('green', '\n✅ Stripe CLI is installed\n');
  
  // Authenticate with Stripe
  const authenticated = await authenticateStripeCli();
  if (!authenticated) {
    rl.close();
    return;
  }
  
  // Setup development webhook
  await setupDevelopmentWebhook();
  
  // Show production setup instructions
  await setupProductionWebhook();
  
  // Show next steps
  showNextSteps();
  
  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('yellow', '\n\n👋 Setup cancelled. You can run this script again anytime with: npm run webhook:setup');
  rl.close();
  process.exit(0);
});

// Run the setup assistant
main().catch(error => {
  log('red', '💥 Setup error:', error.message);
  rl.close();
  process.exit(1);
});