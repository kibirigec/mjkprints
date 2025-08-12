#!/usr/bin/env node

// Apply migration using direct PostgreSQL connection
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function executeDirectSQL() {
  try {
    console.log('🔄 Loading migration file...')
    
    // Read the migration file
    const migrationPath = resolve('./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    const migrationSQL = await readFile(migrationPath, 'utf-8')
    
    console.log('📦 Migration content loaded')
    console.log('📝 Migration contains:')
    console.log('   • File uploads table policies')
    console.log('   • Orders table policies') 
    console.log('   • Order items table policies')
    console.log('   • Downloads table policies')
    console.log('   • Customers table policies')
    console.log('   • Products table policies')
    console.log('')
    
    console.log('🎯 Since automated execution has limitations, here\'s the manual approach:')
    console.log('')
    console.log('1. 📋 Copy the ENTIRE migration file content from:')
    console.log('   ./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    console.log('')
    console.log('2. 🌐 Go to your Supabase Dashboard:')
    console.log('   https://supabase.com/dashboard/project/hminnrncnrquogdwnpan/sql')
    console.log('')
    console.log('3. 📝 Paste the entire migration into the SQL Editor')
    console.log('')
    console.log('4. ▶️  Click "Run" to execute all the policies')
    console.log('')
    console.log('5. 🧪 Verify the fix:')
    console.log('   npm run test:checkout')
    console.log('')
    console.log('Expected result after migration:')
    console.log('✅ Write Permissions: ✅ Working')
    console.log('✅ Checkout session created successfully!')
    console.log('')
    
    // Show first few lines of migration for verification
    const lines = migrationSQL.split('\n').slice(0, 10)
    console.log('📋 Migration preview (first 10 lines):')
    console.log('─'.repeat(60))
    lines.forEach((line, i) => {
      console.log(`${String(i + 1).padStart(2)}: ${line}`)
    })
    console.log('─'.repeat(60))
    console.log(`... ${migrationSQL.split('\n').length - 10} more lines`)
    
  } catch (err) {
    console.error('❌ Error loading migration:', err.message)
    process.exit(1)
  }
}

executeDirectSQL()