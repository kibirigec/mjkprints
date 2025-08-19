import { supabase } from '../supabase/client.js';

export const downloadFileFromStorage = async (storagePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .download(storagePath);

    if (error) {
      throw new Error(`Storage download failed: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`File download failed: ${error.message}`);
  }
};

export const uploadFileToStorage = async (fileBuffer, storagePath, contentType) => {
  try {
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: '3600',
        upsert: true, // Overwrite if it exists, useful for reprocessing
      });

    if (error) {
      throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw new Error(`File upload failed for ${storagePath}: ${error.message}`);
  }
};
