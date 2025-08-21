import { supabase, supabaseAdmin } from './client.js';

export const getFileStorageUrl = (storagePath) => {
  try {
    const { data } = supabase.storage
      .from('mjk-prints-storage')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (error) {
    console.error('[STORAGE-URL] Failed to generate public URL:', error.message);
    throw new Error(`Failed to generate public URL: ${error.message}`);
  }
};

export const createFileUpload = async (fileData) => {
  try {
    if (!fileData.file_name || !fileData.file_size || !fileData.storage_path || !fileData.file_type) {
      throw new Error('Missing required fields: file_name, file_size, file_type, and storage_path are required');
    }
    if (!['pdf', 'image'].includes(fileData.file_type)) {
      throw new Error('Invalid file_type: must be either "pdf" or "image"');
    }
    
    const insertData = {
      product_id: fileData.product_id || null,
      file_name: fileData.file_name,
      file_size: fileData.file_size,
      file_type: fileData.file_type,
      storage_path: fileData.storage_path,
      is_primary: fileData.is_primary || false,
      content_type: fileData.content_type || (fileData.file_type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
      checksum: fileData.checksum,
      processing_status: fileData.processing_status || 'pending',
      created_at: new Date().toISOString()
    };
    
    if (fileData.file_type === 'image') {
      insertData.color_profile = fileData.color_profile || null;
      insertData.orientation = fileData.orientation || null;
    }
    
    const client = supabaseAdmin || supabase;
    const { data, error } = await client
      .from('file_uploads')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('File with this checksum already exists');
      if (error.code === '23503') throw new Error('Referenced product does not exist');
      if (error.code === '23514') throw new Error('File data violates database constraints');
      if (error.message.includes('permission denied')) throw new Error('Database permission denied for file uploads');
      throw new Error(`Failed to create file upload: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const createImageUpload = async (imageData) => {
  const fileData = { ...imageData, file_type: 'image' };
  return await createFileUpload(fileData);
};

export const createPDFUpload = async (pdfData) => {
  const fileData = { ...pdfData, file_type: 'pdf', content_type: 'application/pdf' };
  return await createFileUpload(fileData);
};

export const uploadFileToStorage = async (file, storagePath, contentType = 'application/pdf') => {
  try {
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        duplex: 'half',
        contentType: contentType
      });

    if (error) {
      if (error.message.includes('already exists')) throw new Error(`File already exists at path: ${storagePath}`);
      if (error.message.includes('Bucket not found')) throw new Error('Storage bucket not found. Please check configuration.');
      if (error.message.includes('Payload too large')) throw new Error('File size exceeds storage limits');
      if (error.message.includes('Invalid file type') || error.message.includes('mime type')) throw new Error(`File type not allowed by storage policy. Detected MIME type: ${contentType}`);
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const deleteFileFromStorage = async (storagePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .remove([storagePath]);
    if (error) {
      throw new Error(`Failed to delete file from storage: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const createFileUploadWithTransaction = async (fileData, uploadFunction) => {
  let uploadResult = null;
  let dbRecord = null;
  try {
    uploadResult = await uploadFunction();
    dbRecord = await createFileUpload(fileData);
    return { fileUpload: dbRecord, storageResult: uploadResult };
  } catch (error) {
    if (uploadResult && !dbRecord) {
      try {
        await deleteFileFromStorage(fileData.storage_path);
      } catch (rollbackError) {
        console.error('[TRANSACTION] Storage rollback failed', { rollbackError: rollbackError.message });
      }
    }
    if (dbRecord) {
      try {
        await supabase.from('file_uploads').delete().eq('id', dbRecord.id);
      } catch (rollbackError) {
        console.error('[TRANSACTION] Database rollback failed', { rollbackError: rollbackError.message });
      }
    }
    throw error;
  }
};

export const getFileUploadById = async (fileId) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!fileId || typeof fileId !== 'string' || !uuidRegex.test(fileId)) {
    return null;
  }
  const client = supabaseAdmin || supabase;
  const { data, error } = await client.from('file_uploads').select('*').eq('id', fileId).single();
  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('invalid input syntax for type uuid')) {
      return null;
    }
    throw new Error(`Failed to fetch file upload: ${error.message}`);
  }
  return data;
};

export const getProductFilesForAttachment = async (orderItems) => {
  const attachmentFiles = [];
  try {
    for (const item of orderItems) {
      const product = item.products;
      if (!product) continue;
      
      let fileToAttach = null;
      if (product.pdf_file && product.pdf_file.storage_path) {
        fileToAttach = product.pdf_file;
      } else if (product.image_file && product.image_file.storage_path) {
        fileToAttach = product.image_file;
      }
      if (!fileToAttach) continue;

      const fileSizeBytes = fileToAttach.file_size || 0;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      if (fileSizeMB > 25) continue;

      try {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('mjk-prints-storage')
          .download(fileToAttach.storage_path);
        if (fileError || !fileData) continue;

        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Content = buffer.toString('base64');
        
        let contentType = fileToAttach.file_type === 'image' ? (fileToAttach.content_type || 'image/jpeg') : 'application/pdf';
        let filename = fileToAttach.file_name || `${product.title}.${fileToAttach.file_type === 'pdf' ? 'pdf' : 'jpg'}`;

        attachmentFiles.push({
          content: base64Content,
          filename: filename,
          type: contentType,
          disposition: 'attachment',
          productTitle: product.title,
          fileSize: fileSizeBytes
        });
      } catch (downloadError) {
        console.error('[ATTACHMENT] Error processing file for attachment:', { product: product.title, error: downloadError.message });
        continue;
      }
    }
    return attachmentFiles;
  } catch (error) {
    console.error('[ATTACHMENT] Failed to retrieve product files for attachment:', error.message);
    return [];
  }
};

export const getStorageBucketInfo = async () => {
  try {
    // Attempt to list files to check if the bucket is accessible
    const { data, error } = await supabase.storage.from('mjk-prints-storage').list();
    
    if (error) {
      console.error('[STORAGE-HEALTH] Supabase storage error during list:', error.message);
      return {
        exists: false,
        public: false,
        error: error.message
      };
    }
    
    // If list is successful, the bucket exists and is accessible
    return {
      exists: true,
      public: true, // Assuming it's public as per setup SQL
      name: 'mjk-prints-storage',
      id: 'mjk-prints-storage', // ID is usually same as name for user-created buckets
      error: null
    };
  } catch (error) {
    console.error('[STORAGE-HEALTH] Unexpected error during storage check:', error.message);
    return {
      exists: false,
      public: false,
      error: error.message
    };
  }
};
