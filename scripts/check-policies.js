#!/usr/bin/env node

// Check what RLS policies actually exist in the database
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkPolicies() {
  try {
    console.log('🔍 Checking existing RLS policies in database...\n')
    
    // Query to check current policies
    const { data, error } = await supabase
      .from('pg_policies')
      .select('schemaname, tablename, policyname, cmd, permissive')
      .eq('schemaname', 'public')
      .in('tablename', ['file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products'])
      .order('tablename')
      .order('cmd')
    
    if (error) {
      // If pg_policies doesn't work, try the SQL query directly
      console.log('🔄 Trying direct SQL query...')
      
      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
        sql: `
        SELECT schemaname, tablename, policyname, cmd, permissive
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('file_uploads', 'orders', 'order_items', 'downloads', 'customers', 'products')
        ORDER BY tablename, cmd;
        `
      })
      
      if (sqlError) {
        console.error('❌ Failed to check policies:', sqlError.message)
        return
      }
      
      console.log('📋 Current RLS Policies:')
      console.log(sqlData)
      return
    }
    
    if (!data || data.length === 0) {
      console.log('❌ No RLS policies found for key tables!')
      console.log('This confirms the migration was NOT applied.')
      console.log('')
      console.log('🎯 You need to run this SQL in Supabase SQL Editor:')
      console.log('───────────────────────────────────────────────')
      console.log('DROP POLICY IF EXISTS "Enable insert for file_uploads" ON file_uploads;')
      console.log('CREATE POLICY "Enable insert for file_uploads" ON file_uploads FOR INSERT WITH CHECK (true);')
      console.log('')
      console.log('DROP POLICY IF EXISTS "Enable insert for orders" ON orders;') 
      console.log('CREATE POLICY "Enable insert for orders" ON orders FOR INSERT WITH CHECK (true);')
      console.log('')
      console.log('DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;')
      console.log('CREATE POLICY "Enable insert for order_items" ON order_items FOR INSERT WITH CHECK (true);')
      console.log('───────────────────────────────────────────────')
      return
    }
    
    console.log('📋 Current RLS Policies by Table:')
    console.log('━'.repeat(80))
    
    const grouped = data.reduce((acc, policy) => {
      if (!acc[policy.tablename]) {
        acc[policy.tablename] = []
      }
      acc[policy.tablename].push(policy)
      return acc
    }, {})
    
    Object.keys(grouped).forEach(table => {
      console.log(`\n🗂️  ${table.toUpperCase()} TABLE:`)
      grouped[table].forEach(policy => {
        const status = policy.cmd === 'INSERT' ? '✅' : '🔍'
        console.log(`   ${status} ${policy.cmd}: "${policy.policyname}"`)
      })
    })
    
    console.log('\n🧪 Testing INSERT policies...')
    
    // Test if INSERT policies exist for critical tables
    const criticalTables = ['file_uploads', 'orders', 'order_items']
    const missingInsertPolicies = []
    
    criticalTables.forEach(table => {
      const hasInsertPolicy = data.some(policy => 
        policy.tablename === table && policy.cmd === 'INSERT'
      )
      
      if (hasInsertPolicy) {
        console.log(`   ✅ ${table}: Has INSERT policy`)
      } else {
        console.log(`   ❌ ${table}: MISSING INSERT policy`)
        missingInsertPolicies.push(table)
      }
    })
    
    if (missingInsertPolicies.length === 0) {
      console.log('\n🎉 All INSERT policies exist! The issue may be elsewhere.')
      console.log('💡 Try running the health check again - it should work now.')
    } else {
      console.log(`\n🚨 Missing INSERT policies for: ${missingInsertPolicies.join(', ')}`)
      console.log('📝 The migration was not fully applied.')
    }
    
  } catch (err) {
    console.error('❌ Error checking policies:', err.message)
  }
}

checkPolicies()