import pdfParse from 'pdf-parse';
import { getFileRecord, updateFileStatus, updateFileWithResults } from './database.js';
import { downloadFileFromStorage } from './storage.js';
import { generatePreviewImages, generateThumbnails } from './previews.js';

const extractPDFMetadata = async (pdfBuffer) => {
  try {
    const pdfData = await pdfParse(pdfBuffer);
    return {
      pageCount: pdfData.numpages,
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      subject: pdfData.info?.Subject || null,
      keywords: pdfData.info?.Keywords || null,
      textContent: pdfData.text ? pdfData.text.substring(0, 1000) : null
    };
  } catch (error) {
    throw new Error(`PDF metadata extraction failed: ${error.message}`);
  }
};

export const processPdfFile = async (fileId) => {
  if (!fileId) {
    throw new Error('File ID is required for processing.');
  }

  try {
    const fileUpload = await getFileRecord(fileId);
    if (!fileUpload) throw new Error(`File not found: ${fileId}`);
    if (fileUpload.processing_status === 'completed') return fileUpload;
    if (fileUpload.processing_status === 'processing') throw new Error('File is already being processed.');

    await updateFileStatus(fileId, 'processing');

    const pdfBuffer = await downloadFileFromStorage(fileUpload.storage_path);
    
    const metadata = await extractPDFMetadata(pdfBuffer);
    
    // For dimensions, we'll let the renderer handle it, but for now, we can pass null
    const dimensions = null; // This would be improved by a dedicated dimensions module

    const previewUrls = await generatePreviewImages(pdfBuffer, fileId);
    const thumbnailUrls = await generateThumbnails(pdfBuffer, fileId, metadata.pageCount);

    const processingData = {
      pageCount: metadata.pageCount,
      dimensions,
      previewUrls,
      thumbnailUrls,
      metadata: { ...metadata, processedAt: new Date().toISOString() }
    };

    const updatedFile = await updateFileWithResults(fileId, processingData);
    return updatedFile;

  } catch (error) {
    console.error(`[PDF-PROCESSOR] Failed to process file ${fileId}:`, error);
    if (fileId) {
      try {
        await updateFileStatus(fileId, 'failed', { error: error.message });
      } catch (updateError) {
        console.error(`[PDF-PROCESSOR] Failed to update status to 'failed' for ${fileId}:`, updateError);
      }
    }
    throw error; // Re-throw the original error to be handled by the API route
  }
};
