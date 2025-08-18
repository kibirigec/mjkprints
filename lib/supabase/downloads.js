import { supabase, supabaseAdmin } from './client.js';

export const createDownloadLinks = async (orderItems, customerEmail) => {
  const client = supabaseAdmin || supabase;
  const downloads = orderItems.map(item => ({
    order_item_id: item.id,
    customer_email: customerEmail,
    product_id: item.product_id,
    download_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download/${item.id}?email=${encodeURIComponent(customerEmail)}`,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    download_count: 0,
    created_at: new Date().toISOString()
  }));

  const { data, error } = await client
    .from('downloads')
    .insert(downloads)
    .select();

  if (error) {
    console.error('[CREATE-DOWNLOADS] Failed to create download links:', { error: error.message, code: error.code, details: error.details, hint: error.hint });
    throw new Error(`Failed to create download links: ${error.message}`);
  }
  return data;
};

export const getDownloadsByEmail = async (email) => {
  const { data, error } = await supabase
    .from('downloads')
    .select(`*,
      products (*)
    `)
    .eq('customer_email', email)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch downloads: ${error.message}`);
  }
  return data || [];
};

export const updateDownloadCount = async (orderItemId, customerEmail) => {
  const { data, error } = await supabase
    .from('downloads')
    .update({ 
      download_count: supabase.raw('download_count + 1'),
      last_downloaded_at: new Date().toISOString()
    })
    .eq('order_item_id', orderItemId)
    .eq('customer_email', customerEmail)
    .select();

  if (error) {
    throw new Error(`Failed to update download count: ${error.message}`);
  }
  return data;
};

export const getDownloadByOrderItem = async (orderItemId, customerEmail) => {
  const { data, error } = await supabase
    .from('downloads')
    .select(`*,
      order_items (
        id,
        product_id,
        products (
          title,
          pdf_file_id,
          image_file_id,
          pdf_file:file_uploads!pdf_file_id (id, file_name, storage_path, file_type, file_size),
          image_file:file_uploads!image_file_id (id, file_name, storage_path, file_type, file_size)
        )
      )
    `)
    .eq('order_item_id', orderItemId)
    .eq('customer_email', customerEmail)
    .single();

  if (error) {
    throw new Error(`Failed to get download: ${error.message}`);
  }
  return data;
};
