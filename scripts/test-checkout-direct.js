#!/usr/bin/env node

// Direct test of the checkout API with detailed logging
import { config } from 'dotenv'

// Load environment variables first
config({ path: '.env.local' })

// Then import functions after env is loaded
const { createOrder, createOrderItems } = await import('../lib/supabase.js')

async function testCheckoutDirect() {
  
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
    
      id: order.id,
      email: order.email,
      total_amount: order.total_amount,
      status: order.status
    })
    
    
    const orderItems = await createOrderItems(order.id, testItems)
    
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    })))
    
    
    // Clean up test data
    await import('../lib/supabase.js').then(async ({ supabaseAdmin }) => {
      if (supabaseAdmin) {
        await supabaseAdmin.from('order_items').delete().eq('order_id', order.id)
        await supabaseAdmin.from('orders').delete().eq('id', order.id)
      }
    })
    
  } catch (error) {
    console.error('❌ Direct checkout test failed:')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Additional error analysis
    if (error.message.includes('violates row-level security policy')) {
    }
    
    if (error.message.includes('violates foreign key constraint')) {
    }
    
    if (error.message.includes('violates check constraint')) {
    }
  }
}

testCheckoutDirect()