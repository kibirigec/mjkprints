import { supabaseAdmin } from '../supabase/client.js';

export const getFileRecord = async (fileId) => {
  const { data, error } = await supabaseAdmin
    .from('file_uploads')
    .select('*')
    .eq('id', fileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found, not an error
    throw new Error(`Failed to fetch file record: ${error.message}`);
  }
  return data;
};

export const updateFileStatus = async (fileId, status, metadata = null) => {
  const updateData = { processing_status: status };
  if (metadata) {
    updateData.processing_metadata = metadata;
  }

  const { data, error } = await supabaseAdmin
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update file status to ${status}: ${error.message}`);
  }
  return data;
};

export const updateFileWithResults = async (fileId, results) => {
  const updateData = {
    processing_status: 'completed',
    dimensions: results.dimensions,
    preview_urls: results.previewUrls,
    thumbnail_urls: results.thumbnailUrls,
    page_count: results.pageCount,
    processing_metadata: results.metadata
  };

  const { data, error } = await supabaseAdmin
    .from('file_uploads')
    .update(updateData)
    .eq('id', fileId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update file with processing results: ${error.message}`);
  }
  return data;
};
