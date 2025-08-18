#!/usr/bin/env node
/**
 * Stripe Webhook Setup Script for MJK Prints
 * Provides interactive setup for Stripe webhooks in development and production
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = {
}

class StripeWebhookSetup {
  constructor() {
    this.envFile = path.join(process.cwd(), '.env.local')
    this.currentEnv = this.loadEnvVars()
  }

  loadEnvVars() {
    try {
      if (fs.existsSync(this.envFile)) {
        const content = fs.readFileSync(this.envFile, 'utf8')
        const env = {}
        content.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length) {
            env[key.trim()] = valueParts.join('=').trim()
          }
        })
        return env
      }
    } catch (error) {
      log.warning(`Error reading .env.local: ${error.message}`)
    }
    return {}
  }

  async checkStripeConfiguration() {
    log.section('🔍 Checking Current Stripe Configuration')
    
    const requiredKeys = [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ]

    let allConfigured = true

    for (const key of requiredKeys) {
      if (this.currentEnv[key] && !this.currentEnv[key].includes('your_') && !this.currentEnv[key].includes('placeholder')) {
        log.success(`${key}: Configured`)
      } else {
        log.error(`${key}: Missing or placeholder value`)
        allConfigured = false
      }
    }

    return allConfigured
  }

  displayWebhookSetupInstructions() {
    log.section('📖 Stripe Webhook Setup Instructions')
    
    
  }

  displayTestingInstructions() {
    log.section('🧪 Testing Your Webhook Setup')
    
  }

  displayTroubleshootingTips() {
    log.section('🔧 Troubleshooting Common Issues')
    
  }

  async updateWebhookSecret(secret) {
    if (!secret || !secret.startsWith('whsec_')) {
      log.error('Invalid webhook secret. Must start with whsec_')
      return false
    }

    try {
      let envContent = ''
      if (fs.existsSync(this.envFile)) {
        envContent = fs.readFileSync(this.envFile, 'utf8')
      }

      // Update or add webhook secret
      if (envContent.includes('STRIPE_WEBHOOK_SECRET=')) {
        envContent = envContent.replace(
          /STRIPE_WEBHOOK_SECRET=.*/,
          `STRIPE_WEBHOOK_SECRET=${secret}`
        )
      } else {
        envContent += `\nSTRIPE_WEBHOOK_SECRET=${secret}\n`
      }

      fs.writeFileSync(this.envFile, envContent)
      log.success('Webhook secret updated in .env.local')
      return true
    } catch (error) {
      log.error(`Failed to update .env.local: ${error.message}`)
      return false
    }
  }

  async testWebhookEndpoint() {
    log.section('🔍 Testing Webhook Endpoint')
    
    try {
      const fetch = require('node-fetch')
      const response = await fetch('http://localhost:3001/api/webhooks/stripe', {
        method: 'GET'
      })
      
      if (response.status === 405) {
        log.success('Webhook endpoint is accessible (returned 405 Method Not Allowed as expected)')
        return true
      } else {
        log.warning(`Webhook endpoint returned status: ${response.status}`)
        return false
      }
    } catch (error) {
      log.error(`Cannot reach webhook endpoint: ${error.message}`)
      log.info('Make sure your development server is running: npm run dev')
      return false
    }
  }

  async run() {

    // Check current configuration
    const isConfigured = await this.checkStripeConfiguration()
    
    if (isConfigured) {
      log.success('Stripe keys are configured!')
      
      // Test webhook endpoint if dev server is running
      await this.testWebhookEndpoint()
    } else {
      log.warning('Stripe configuration incomplete')
    }

    // Display setup instructions
    this.displayWebhookSetupInstructions()
    this.displayTestingInstructions()
    this.displayTroubleshootingTips()

    // Quick setup option
    log.section('⚡ Quick Setup')
    
    // Handle command line secret update
    const secretArg = process.argv.find(arg => arg.startsWith('--secret='))
    if (secretArg) {
      const secret = secretArg.split('=')[1]
      await this.updateWebhookSecret(secret)
    } else if (process.argv.includes('--secret') && process.argv[process.argv.indexOf('--secret') + 1]) {
      const secret = process.argv[process.argv.indexOf('--secret') + 1]
      await this.updateWebhookSecret(secret)
    }

  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new StripeWebhookSetup()
  setup.run().catch(error => {
    log.error(`Setup failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = StripeWebhookSetup