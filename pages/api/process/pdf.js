import { processPdfFile } from '../../../lib/pdf/processor.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'Missing file ID' });
  }

  try {
    const result = await processPdfFile(fileId);
    res.status(200).json({ success: true, message: 'PDF processed successfully', file: result });
  } catch (error) {
    console.error(`[API-PDF-PROCESS] Error processing file ${fileId}:`, error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, error: 'Processing failed', details: error.message });
  }
}
