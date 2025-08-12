#!/usr/bin/env node

// Direct insert test to diagnose RLS issues
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

// Create both anon and admin clients
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function directInsertTest() {
  console.log('🧪 Direct INSERT test to diagnose RLS issues...\n')
  
  const testData = {
    file_name: 'direct-test.pdf',
    file_size: 1024,
    file_type: 'pdf',
    storage_path: 'test/direct-test.pdf',
    content_type: 'application/pdf',
    processing_status: 'pending'
  }
  
  // Test 1: Try with anon client (should be subject to RLS)
  console.log('📝 Test 1: INSERT with anon client (subject to RLS policies)...')
  try {
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('file_uploads')
      .insert([testData])
      .select()
      .single()
    
    if (anonError) {
      console.log(`   ❌ Anon insert failed: ${anonError.message}`)
      if (anonError.message.includes('row-level security policy')) {
        console.log('   🔍 This is the RLS policy error we need to fix!')
      }
    } else {
      console.log(`   ✅ Anon insert succeeded! File ID: ${anonData.id}`)
      // Clean up
      await supabaseAnon.from('file_uploads').delete().eq('id', anonData.id)
    }
  } catch (err) {
    console.log(`   ❌ Anon insert exception: ${err.message}`)
  }
  
  console.log('')
  
  // Test 2: Try with admin client (should bypass RLS)
  console.log('🔑 Test 2: INSERT with admin client (bypasses RLS)...')
  try {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('file_uploads')
      .insert([testData])
      .select()
      .single()
    
    if (adminError) {
      console.log(`   ❌ Admin insert failed: ${adminError.message}`)
      if (adminError.message.includes('row-level security policy')) {
        console.log('   🚨 CRITICAL: Even admin client hitting RLS! Something is very wrong.')
      } else {
        console.log('   💡 This might be a constraint or other database error')
      }
    } else {
      console.log(`   ✅ Admin insert succeeded! File ID: ${adminData.id}`)
      console.log('   🎯 This proves the database structure is correct!')
      
      // Clean up
      await supabaseAdmin.from('file_uploads').delete().eq('id', adminData.id)
      console.log('   🧹 Test record cleaned up')
    }
  } catch (err) {
    console.log(`   ❌ Admin insert exception: ${err.message}`)
  }
  
  console.log('')
  
  // Test 3: Check if we can create orders (the main checkout issue)
  console.log('🛒 Test 3: Testing order creation (main checkout issue)...')
  
  const orderData = {
    email: 'test@example.com',
    total_amount: 19.99,
    currency: 'USD',
    status: 'pending'
  }
  
  try {
    const { data: orderResult, error: orderError } = await supabaseAnon
      .from('orders')
      .insert([orderData])
      .select()
      .single()
    
    if (orderError) {
      console.log(`   ❌ Order insert failed: ${orderError.message}`)
    } else {
      console.log(`   ✅ Order insert succeeded! Order ID: ${orderResult.id}`)
      // Clean up
      await supabaseAnon.from('orders').delete().eq('id', orderResult.id)
    }
  } catch (err) {
    console.log(`   ❌ Order insert exception: ${err.message}`)
  }
  
  console.log('')
  console.log('🎯 DIAGNOSIS SUMMARY:')
  console.log('━'.repeat(50))
  console.log('If admin client works but anon client fails:')
  console.log('  → RLS policies missing for anon role')
  console.log('If both clients fail with RLS errors:')
  console.log('  → RLS policies not applied correctly')
  console.log('If both clients fail with constraint errors:')
  console.log('  → Database schema issues')
  console.log('If admin works and anon works:')
  console.log('  → RLS policies are correctly applied! ✅')
}

directInsertTest()