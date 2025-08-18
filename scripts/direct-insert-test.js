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
  
  const testData = {
    file_name: 'direct-test.pdf',
    file_size: 1024,
    file_type: 'pdf',
    storage_path: 'test/direct-test.pdf',
    content_type: 'application/pdf',
    processing_status: 'pending'
  }
  
  // Test 1: Try with anon client (should be subject to RLS)
  try {
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('file_uploads')
      .insert([testData])
      .select()
      .single()
    
    if (anonError) {
      if (anonError.message.includes('row-level security policy')) {
      }
    } else {
      // Clean up
      await supabaseAnon.from('file_uploads').delete().eq('id', anonData.id)
    }
  } catch (err) {
  }
  
  
  // Test 2: Try with admin client (should bypass RLS)
  try {
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('file_uploads')
      .insert([testData])
      .select()
      .single()
    
    if (adminError) {
      if (adminError.message.includes('row-level security policy')) {
      } else {
      }
    } else {
      
      // Clean up
      await supabaseAdmin.from('file_uploads').delete().eq('id', adminData.id)
    }
  } catch (err) {
  }
  
  
  // Test 3: Check if we can create orders (the main checkout issue)
  
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
    } else {
      // Clean up
      await supabaseAnon.from('orders').delete().eq('id', orderResult.id)
    }
  } catch (err) {
  }
  
}

directInsertTest()