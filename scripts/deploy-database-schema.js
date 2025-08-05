#!/usr/bin/env node

/**
 * Database Schema Deployment Script
 * 
 * This script deploys the complete MJK Prints database schema including:
 * - All required tables with proper relationships
 * - Storage bucket configuration
 * - Database functions and triggers
 * - RLS policies for security
 * - Indexes for performance
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure .env.local contains:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Execute SQL commands with proper error handling
 */
async function executeSQLCommand(sql, description) {
  try {
    console.log(`   Executing: ${description}`)
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // For certain operations like CREATE TABLE IF NOT EXISTS, we might get errors
      // that are actually OK (like table already exists)
      if (error.message.includes('already exists') || 
          error.message.includes('does not exist') ||
          error.code === '42P07') {
        console.log(`   ⚠️  ${description}: ${error.message} (continuing...)`)
        return { success: true, warning: error.message }
      }
      
      throw new Error(`${description} failed: ${error.message}`)
    }
    
    console.log(`   ✅ ${description}: Success`)
    return { success: true, data }
  } catch (err) {
    console.error(`   ❌ ${description}: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * Deploy schema by reading and executing the SQL file
 */
async function deployDatabaseSchema() {
  console.log('🚀 MJK Prints Database Schema Deployment')
  console.log('=' .repeat(50))
  console.log()
  
  // Test database connection first
  console.log('🔌 Testing Database Connection...')
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1)
    
    if (error) {
      throw new Error(`Connection failed: ${error.message}`)
    }
    
    console.log('   ✅ Database connection successful')
  } catch (err) {
    console.error('   ❌ Database connection failed:', err.message)
    console.error('   Please check your Supabase configuration and network connectivity')
    process.exit(1)
  }
  console.log()
  
  // Read the schema file
  console.log('📋 Loading Schema File...')
  const schemaPath = path.join(__dirname, '..', 'supabase-setup.sql')
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`   ❌ Schema file not found: ${schemaPath}`)
    console.error('   Please ensure supabase-setup.sql exists in the project root')
    process.exit(1)
  }
  
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8')
  console.log(`   ✅ Schema file loaded (${schemaSQL.length} characters)`)
  console.log()
  
  // Split SQL into individual commands
  console.log('⚙️  Parsing SQL Commands...')
  
  // Split by semicolons but be careful about semicolons inside strings and functions
  const sqlCommands = schemaSQL
    .split(/;\s*\n/)
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    .map(cmd => cmd.endsWith(';') ? cmd : cmd + ';')
  
  console.log(`   ✅ Found ${sqlCommands.length} SQL commands to execute`)
  console.log()
  
  // Execute commands one by one
  console.log('🔨 Executing Schema Commands...')
  let successCount = 0
  let warningCount = 0
  let errorCount = 0
  
  for (let i = 0; i < sqlCommands.length; i++) {
    const command = sqlCommands[i]
    
    // Skip empty commands or comments
    if (!command || command.startsWith('--') || command.trim() === ';') {
      continue
    }
    
    // Generate a description based on the command
    let description = `Command ${i + 1}`
    if (command.includes('CREATE TABLE')) {
      const match = command.match(/CREATE TABLE.*?(\w+)/i)
      description = match ? `Create table: ${match[1]}` : 'Create table'
    } else if (command.includes('CREATE INDEX')) {
      const match = command.match(/CREATE INDEX.*?(\w+)/i)
      description = match ? `Create index: ${match[1]}` : 'Create index'
    } else if (command.includes('CREATE FUNCTION')) {
      const match = command.match(/CREATE.*?FUNCTION.*?(\w+)/i)
      description = match ? `Create function: ${match[1]}` : 'Create function'
    } else if (command.includes('CREATE TRIGGER')) {
      const match = command.match(/CREATE TRIGGER.*?(\w+)/i)
      description = match ? `Create trigger: ${match[1]}` : 'Create trigger'
    } else if (command.includes('CREATE POLICY')) {
      description = 'Create RLS policy'
    } else if (command.includes('INSERT INTO storage.buckets')) {
      description = 'Create storage bucket'
    } else if (command.includes('INSERT INTO')) {
      description = 'Insert sample data'
    } else if (command.includes('ALTER TABLE')) {
      description = 'Alter table structure'
    }
    
    // Execute the command
    const result = await executeSQLCommand(command, description)
    
    if (result.success) {
      if (result.warning) {
        warningCount++
      } else {
        successCount++
      }
    } else {
      errorCount++
    }
    
    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log()
  console.log('📊 Deployment Summary:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ⚠️  Warnings: ${warningCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log()
  
  if (errorCount > 0) {
    console.log('⚠️  Some commands failed. This might be expected if:')
    console.log('   - Tables or functions already exist')
    console.log('   - RLS policies were already created')
    console.log('   - Storage bucket already exists')
    console.log()
    console.log('🔍 Run verification script to check final status:')
    console.log('   node scripts/verify-database-status.js')
  } else {
    console.log('✅ Schema deployment completed successfully!')
    console.log()
    console.log('🎉 Next Steps:')
    console.log('   1. Verify deployment: node scripts/verify-database-status.js')
    console.log('   2. Test PDF upload: node test-pdf-workflow.js')
    console.log('   3. Start development: npm run dev')
  }
  
  return {
    success: errorCount === 0,
    stats: { successCount, warningCount, errorCount }
  }
}

/**
 * Alternative deployment using direct SQL execution
 * This method works better with Supabase's RPC approach
 */
async function deploySchemaDirectly() {
  console.log('🚀 Direct Schema Deployment (Alternative Method)')
  console.log('=' .repeat(50))
  console.log()
  
  console.log('📋 This deployment method requires manual execution in Supabase SQL Editor')
  console.log()
  console.log('🔧 Manual Deployment Steps:')
  console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard')
  console.log('   2. Go to your project: ' + supabaseUrl.replace('https://', '').split('.')[0])
  console.log('   3. Navigate to: SQL Editor')
  console.log('   4. Create a new query')
  console.log('   5. Copy and paste the contents of: supabase-setup.sql')
  console.log('   6. Execute the query (RUN button)')
  console.log('   7. Verify with: node scripts/verify-database-status.js')
  console.log()
  
  console.log('💡 Why manual deployment might be needed:')
  console.log('   - Storage bucket creation requires elevated privileges')
  console.log('   - RLS policy creation may need service role access')
  console.log('   - Complex functions require direct SQL execution')
  console.log()
  
  console.log('📍 Schema file location: /Users/Calvin/Desktop/mjkprints/supabase-setup.sql')
  console.log()
  
  return { success: false, requiresManual: true }
}

// Main execution
if (require.main === module) {
  const method = process.argv[2] || 'auto'
  
  if (method === 'manual') {
    deploySchemaDirectly()
      .then(result => {
        if (result.requiresManual) {
          console.log('📋 Manual deployment instructions provided')
          process.exit(0)
        }
      })
      .catch(error => {
        console.error('❌ Deployment failed:', error.message)
        process.exit(1)
      })
  } else {
    // Auto deployment (will likely need manual follow-up)
    console.log('⚠️  Note: Automatic deployment may have limitations with Supabase.')
    console.log('   If automatic deployment fails, use: node scripts/deploy-database-schema.js manual')
    console.log()
    
    deployDatabaseSchema()
      .then(result => {
        if (result.success) {
          console.log('✅ Automatic deployment completed')
          process.exit(0)
        } else {
          console.log('⚠️  Automatic deployment had issues. Consider manual deployment.')
          console.log('   Use: node scripts/deploy-database-schema.js manual')
          process.exit(1)
        }
      })
      .catch(error => {
        console.error('❌ Automatic deployment failed:', error.message)
        console.log()
        console.log('🔄 Falling back to manual deployment instructions...')
        deploySchemaDirectly()
        process.exit(1)
      })
  }
}

module.exports = { deployDatabaseSchema, deploySchemaDirectly }