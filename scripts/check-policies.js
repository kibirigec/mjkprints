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
      
      return
    }
    
    if (!data || data.length === 0) {
      return
    }
    
    
    const grouped = data.reduce((acc, policy) => {
      if (!acc[policy.tablename]) {
        acc[policy.tablename] = []
      }
      acc[policy.tablename].push(policy)
      return acc
    }, {})
    
    Object.keys(grouped).forEach(table => {
      grouped[table].forEach(policy => {
        const status = policy.cmd === 'INSERT' ? '✅' : '🔍'
      })
    })
    
    
    // Test if INSERT policies exist for critical tables
    const criticalTables = ['file_uploads', 'orders', 'order_items']
    const missingInsertPolicies = []
    
    criticalTables.forEach(table => {
      const hasInsertPolicy = data.some(policy => 
        policy.tablename === table && policy.cmd === 'INSERT'
      )
      
      if (hasInsertPolicy) {
      } else {
        missingInsertPolicies.push(table)
      }
    })
    
    if (missingInsertPolicies.length === 0) {
    } else {
    }
    
  } catch (err) {
    console.error('❌ Error checking policies:', err.message)
  }
}

checkPolicies()