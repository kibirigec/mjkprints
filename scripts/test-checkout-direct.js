#!/usr/bin/env node

// Direct test of the checkout API with detailed logging
import { config } from 'dotenv'

// Load environment variables first
config({ path: '.env.local' })

// Then import functions after env is loaded
const { createOrder, createOrderItems } = await import('../lib/supabase.js')

async function testCheckoutDirect() {
  console.log('🧪 Direct checkout database operations test...\n')
  
  const testEmail = 'test@mjkprints.com'
  const testTotal = 19.41
  const testItems = [
    {
      product_id: "d79f8300-ea32-4533-b9b8-3665e2e1706b",
      quantity: 1,
      unit_price: 19.41
    }
  ]
  
  try {
    console.log('📝 Step 1: Testing createOrder...')
    console.log('Order data:', {
      email: testEmail,
      total_amount: testTotal,
      status: 'pending'
    })
    
    const order = await createOrder({
      email: testEmail,
      total_amount: testTotal,
      status: 'pending',
      billing_details: {
        name: 'Test Customer',
        address: {
          line1: '123 Test St',
          city: 'Test City',
          state: 'TC',
          postal_code: '12345',
          country: 'US'
        }
      },
      metadata: {
        source: 'direct_test',
        userAgent: 'Node.js Test'
      }
    })
    
    console.log('✅ Order created successfully!')
    console.log('Order ID:', order.id)
    console.log('Order details:', {
      id: order.id,
      email: order.email,
      total_amount: order.total_amount,
      status: order.status
    })
    
    console.log('\n📝 Step 2: Testing createOrderItems...')
    console.log('Order items data:', testItems)
    
    const orderItems = await createOrderItems(order.id, testItems)
    
    console.log('✅ Order items created successfully!')
    console.log('Order items:', orderItems.map(item => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    })))
    
    console.log('\n🎉 All database operations successful!')
    console.log('The issue is likely in the Stripe integration, not database operations.')
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await import('../lib/supabase.js').then(async ({ supabaseAdmin }) => {
      if (supabaseAdmin) {
        await supabaseAdmin.from('order_items').delete().eq('order_id', order.id)
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
        console.log('✅ Test data cleaned up')
      }
    })
    
  } catch (error) {
    console.error('❌ Direct checkout test failed:')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Additional error analysis
    if (error.message.includes('violates row-level security policy')) {
      console.log('\n🔍 ANALYSIS: RLS policy issue')
      console.log('- The admin client is not bypassing RLS as expected')
      console.log('- Check if SUPABASE_SERVICE_ROLE_KEY is set correctly')
    }
    
    if (error.message.includes('violates foreign key constraint')) {
      console.log('\n🔍 ANALYSIS: Foreign key constraint issue')
      console.log('- The product_id might not exist in the products table')
      console.log('- Check if the test product ID is valid')
    }
    
    if (error.message.includes('violates check constraint')) {
      console.log('\n🔍 ANALYSIS: Check constraint issue')
      console.log('- The data values violate database constraints')
      console.log('- Check the data types and value ranges')
    }
  }
}

testCheckoutDirect()