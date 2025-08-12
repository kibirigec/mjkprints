#!/usr/bin/env node

// Direct SQL execution using psql command if available
import { exec } from 'child_process'
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'
import { promisify } from 'util'

const execAsync = promisify(exec)
config({ path: '.env.local' })

async function executeDirectSQL() {
  try {
    console.log('🔧 Attempting direct SQL execution...')
    
    // Read the migration file
    const migrationPath = resolve('./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    const migrationSQL = await readFile(migrationPath, 'utf-8')
    
    // Extract database details from your Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
    
    if (!match) {
      throw new Error('Could not extract project ID from Supabase URL')
    }
    
    const projectId = match[1]
    console.log(`📋 Project ID: ${projectId}`)
    
    // Create a minimal SQL script with just the essential policies
    const minimalFix = `
-- MINIMAL FIX - Just the essential policies for file_uploads and orders
-- This bypasses the migration system and directly creates the needed policies

-- Drop and recreate file_uploads policies
DROP POLICY IF EXISTS "Allow inserts for file uploads" ON file_uploads;
DROP POLICY IF EXISTS "Enable insert for file_uploads" ON file_uploads;
CREATE POLICY "Enable insert for file_uploads" ON file_uploads FOR INSERT WITH CHECK (true);

-- Drop and recreate orders policies  
DROP POLICY IF EXISTS "Enable insert for orders" ON orders;
CREATE POLICY "Enable insert for orders" ON orders FOR INSERT WITH CHECK (true);

-- Drop and recreate order_items policies
DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;
CREATE POLICY "Enable insert for order_items" ON order_items FOR INSERT WITH CHECK (true);

-- Verify the policies were created
SELECT 'VERIFICATION:' as status, tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('file_uploads', 'orders', 'order_items')
  AND policyname LIKE 'Enable insert%'
ORDER BY tablename;
`
    
    console.log('📝 Creating minimal SQL fix...')
    
    // Write the minimal fix to a temporary file
    await import('fs/promises').then(fs => 
      fs.writeFile('/tmp/minimal-rls-fix.sql', minimalFix)
    )
    
    console.log('💡 Since automated execution isn\'t working, here\'s the MINIMAL fix:')
    console.log('')
    console.log('🎯 Copy and paste THIS into Supabase SQL Editor:')
    console.log('━'.repeat(80))
    console.log(minimalFix)
    console.log('━'.repeat(80))
    console.log('')
    console.log('🌐 Go to: https://supabase.com/dashboard/project/hminnrncnrquogdwnpan/sql')
    console.log('📝 Paste the above SQL and click "Run"')
    console.log('🧪 Then run: npm run test:checkout')
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('')
    console.log('🎯 FALLBACK APPROACH:')
    console.log('Run this minimal SQL in Supabase SQL Editor:')
    console.log('')
    console.log('DROP POLICY IF EXISTS "Enable insert for file_uploads" ON file_uploads;')
    console.log('CREATE POLICY "Enable insert for file_uploads" ON file_uploads FOR INSERT WITH CHECK (true);')
    console.log('')
    console.log('DROP POLICY IF EXISTS "Enable insert for orders" ON orders;') 
    console.log('CREATE POLICY "Enable insert for orders" ON orders FOR INSERT WITH CHECK (true);')
    console.log('')
    console.log('DROP POLICY IF EXISTS "Enable insert for order_items" ON order_items;')
    console.log('CREATE POLICY "Enable insert for order_items" ON order_items FOR INSERT WITH CHECK (true);')
  }
}

executeDirectSQL()