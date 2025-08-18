import { supabase, supabaseAdmin } from './client.js';

export const createOrder = async (orderData) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('orders')
    .insert([{
      email: orderData.email,
      total_amount: orderData.total_amount,
      currency: orderData.currency || 'USD',
      status: orderData.status || 'pending',
      stripe_session_id: orderData.stripe_session_id,
      billing_details: orderData.billing_details,
      metadata: orderData.metadata
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }
  return data;
};

export const createOrderItems = async (orderId, items) => {
  const client = supabaseAdmin || supabase;
  const orderItems = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity
  }));

  const { data, error } = await client
    .from('order_items')
    .insert(orderItems)
    .select();

  if (error) {
    throw new Error(`Failed to create order items: ${error.message}`);
  }
  return data;
};

export const updateOrderStatus = async (orderId, status, paymentIntentId = null) => {
  const client = supabaseAdmin || supabase;
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  if (paymentIntentId) {
    updateData.stripe_payment_intent_id = paymentIntentId;
  }

  const { data, error } = await client
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('[UPDATE-ORDER] Failed to update order:', { orderId, status, error: error.message, code: error.code });
    throw new Error(`Failed to update order status: ${error.message}`);
  }
  return data;
};

export const getOrderById = async (orderId) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('orders')
    .select(`*,
      order_items (*, products (*))
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[GET-ORDER] Failed to fetch order:', { orderId, error: error.message, code: error.code });
    throw new Error(`Failed to fetch order: ${error.message}`);
  }
  return data;
};

export const getOrdersByEmail = async (email) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`*,
      order_items (*, products (*))
    `)
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
  return data || [];
};

export const updateOrderWithPayPalId = async (orderId, paypalOrderId) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('orders')
    .update({ 
      stripe_session_id: paypalOrderId, // Reuse this field for PayPal order ID
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('[UPDATE-ORDER-PAYPAL] Failed to update order with PayPal ID:', error);
    throw new Error(`Failed to update order with PayPal ID: ${error.message}`);
  }
  return data;
};

export const getOrderByPayPalId = async (paypalOrderId) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('orders')
    .select(`*,
      order_items (*, products (*))
    `)
    .eq('stripe_session_id', paypalOrderId) // Reuse this field for PayPal order ID
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('[GET-ORDER-PAYPAL] Failed to fetch order by PayPal ID:', error);
    throw new Error(`Failed to fetch order by PayPal ID: ${error.message}`);
  }
  if (error && error.code === 'PGRST116') {
    return null;
  }
  return data;
};
