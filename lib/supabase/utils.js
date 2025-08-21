import { supabase, supabaseAdmin } from './client.js';
import { uploadFileToStorage, deleteFileFromStorage, checkStorageHealth } from './files.js';

export const createOrUpdateCustomer = async (customerData) => {
  const { data, error } = await supabase
    .from('customers')
    .upsert({
      email: customerData.email,
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      stripe_customer_id: customerData.stripe_customer_id,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create/update customer: ${error.message}`);
  }
  return data;
};

export const updateFileProcessingStatus = async (fileId, status, metadata = null) => {
  const updateData = { processing_status: status };
  if (metadata) {
    updateData.processing_metadata = metadata;
  }
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update file processing status: ${error.message}`);
  }
  return data;
};

export const updateFileWithProcessingResults = async (fileId, processingData) => {
  const client = supabaseAdmin || supabase;
  const updateData = {
    processing_status: 'completed',
    dimensions: processingData.dimensions,
    thumbnail_urls: processingData.thumbnail_urls,
    processing_metadata: processingData.metadata
  };
  
  if (processingData.page_count !== undefined) {
    updateData.page_count = processingData.page_count;
    updateData.preview_urls = processingData.preview_urls;
  }
  if (processingData.image_variants) {
    updateData.image_variants = processingData.image_variants;
  }
  if (processingData.color_profile) {
    updateData.color_profile = processingData.color_profile;
  }
  if (processingData.orientation !== undefined) {
    updateData.orientation = processingData.orientation;
  }

  const { data, error } = await client
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update file processing results: ${error.message}`);
  }
  return data;
};

export const cleanupFailedUploads = async () => {
  try {
    const { data, error } = await supabase.rpc('cleanup_failed_uploads');
    if (error) {
      throw new Error(`Failed to cleanup failed uploads: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const performDatabaseHealthCheck = async () => {
  const healthStatus = {
    connection: false,
    tables: { file_uploads: false, products: false, orders: false },
    permissions: { read: false, write: false },
    timestamp: new Date().toISOString()
  };
  
  try {
    const { error: connectionError } = await supabase.from('file_uploads').select('id').limit(1);
    if (!connectionError) {
      healthStatus.connection = true;
      healthStatus.tables.file_uploads = true;
      healthStatus.permissions.read = true;
    }
    
    try {
      const testInsert = { file_name: 'health-check-test.pdf', file_size: 1024, file_type: 'pdf', storage_path: 'health-check/test.pdf', content_type: 'application/pdf', processing_status: 'pending' };
      const { data: insertTest, error: insertError } = await supabase.from('file_uploads').insert([testInsert]).select().single();
      if (!insertError && insertTest) {
        healthStatus.permissions.write = true;
        await supabase.from('file_uploads').delete().eq('id', insertTest.id);
      }
    } catch (writeError) {}
    
    const tables = ['products', 'orders'];
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (!error) healthStatus.tables[table] = true;
      } catch (tableError) {}
    }
    return healthStatus;
  } catch (error) {
    return healthStatus;
  }
};

export const performStorageHealthCheck = async () => {
  const healthStatus = {
    bucketExists: false,
    canList: false,
    canUpload: false,
    canDelete: false,
    bucketInfo: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    const storageHealth = await checkStorageHealth();
    healthStatus.bucketExists = storageHealth.healthy;
    
    if (healthStatus.bucketExists) {
      healthStatus.canList = true; // If we can get bucket info, we can list.
      healthStatus.bucketInfo = storageHealth.details;
      
      const testPath = `health-check/test-${Date.now()}.txt`;
      const testContent = new Blob(['health-check'], { type: 'text/plain' });
      try {
        const uploadResult = await uploadFileToStorage(testContent, testPath, 'text/plain');
        if (uploadResult) {
          healthStatus.canUpload = true;
          try {
            await deleteFileFromStorage(testPath);
            healthStatus.canDelete = true;
          } catch (deleteError) {}
        }
      } catch (uploadError) {}
    }
    return healthStatus;
  } catch (error) {
    return healthStatus;
  }
};

export const performSystemHealthCheck = async () => {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    database: null,
    storage: null,
    environment: { hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL, hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, nodeEnv: process.env.NODE_ENV }
  };
  
  try {
    const [dbHealth, storageHealth] = await Promise.allSettled([ performDatabaseHealthCheck(), performStorageHealthCheck() ]);
    healthCheck.database = dbHealth.status === 'fulfilled' ? dbHealth.value : { error: dbHealth.reason?.message };
    healthCheck.storage = storageHealth.status === 'fulfilled' ? storageHealth.value : { error: storageHealth.reason?.message };
    
    const dbHealthy = healthCheck.database?.connection && healthCheck.database?.permissions?.read;
    const storageHealthy = healthCheck.storage?.bucketExists && healthCheck.storage?.canList;
    const envHealthy = healthCheck.environment.hasSupabaseUrl && healthCheck.environment.hasSupabaseKey;
    
    if (dbHealthy && storageHealthy && envHealthy) {
      healthCheck.overall = 'healthy';
    } else if (dbHealthy || storageHealthy) {
      healthCheck.overall = 'degraded';
    } else {
      healthCheck.overall = 'unhealthy';
    }
    return healthCheck;
  } catch (error) {
    healthCheck.overall = 'error';
    healthCheck.error = error.message;
    return healthCheck;
  }
};
