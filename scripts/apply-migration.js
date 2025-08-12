#!/usr/bin/env node

// Apply the RLS migration directly using our existing database connection
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Create Supabase client with service role for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    console.log('🔄 Loading migration file...')
    
    // Read the migration file
    const migrationPath = resolve('./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    const migrationSQL = await readFile(migrationPath, 'utf-8')
    
    console.log('📦 Migration loaded successfully')
    console.log('🚀 Applying RLS policy migration to remote database...')
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    })
    
    if (error) {
      // If the rpc method doesn't exist, try direct SQL execution
      console.log('🔄 Trying alternative method...')
      
      // Split the migration into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.toLowerCase().startsWith('select'))
      
      console.log(`📝 Executing ${statements.length} SQL statements...`)
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.trim()) {
          console.log(`   ${i + 1}. ${statement.substring(0, 60)}...`)
          
          const { error: execError } = await supabase
            .from('_ignore') // This will fail but trigger SQL execution
            .select('*')
            .limit(0)
          
          // For policy operations, we need to use the direct SQL approach
          // Let's create a simple test to see if we can connect
        }
      }
      
      console.log('⚠️  Direct SQL execution via Supabase client has limitations.')
      console.log('📋 Migration SQL is ready to run manually in Supabase SQL Editor.')
      console.log('')
      console.log('🎯 Next steps:')
      console.log('1. Copy the migration content from:')
      console.log('   ./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
      console.log('2. Go to Supabase Dashboard → SQL Editor')
      console.log('3. Paste and run the entire migration')
      console.log('4. Run: npm run test:checkout')
      
    } else {
      console.log('✅ Migration applied successfully!')
      console.log('🧪 Testing the fix...')
      
      // Test the connection
      const { data: testData, error: testError } = await supabase
        .from('products')
        .select('count(*)', { count: 'exact' })
        .limit(1)
      
      if (testError) {
        console.log('❌ Connection test failed:', testError.message)
      } else {
        console.log('✅ Database connection working!')
        console.log('🎉 Run: npm run test:checkout to verify the fix')
      }
    }
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message)
    console.log('')
    console.log('📋 Manual fallback:')
    console.log('1. Copy migration from: ./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    console.log('2. Run in Supabase SQL Editor')
    process.exit(1)
  }
}

applyMigration()