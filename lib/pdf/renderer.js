import { setupNodeCanvas, NodeCanvasFactory } from './environment.js';

// Initialize the Node.js canvas environment
setupNodeCanvas();

let pdfjsLib = null;

async function initPdfJs() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = false;
    } catch (error) {
      console.error('[PDF-RENDERER] Failed to initialize PDF.js:', error);
      throw new Error(`PDF.js initialization failed: ${error.message}`);
    }
  }
  return pdfjsLib;
}

const convertPDFPageWithCanvas = async (pdfBuffer, pageNumber, scale) => {
  try {
    const pdfjs = await initPdfJs();
    const uint8Array = new Uint8Array(pdfBuffer);
    const canvasFactory = new NodeCanvasFactory();

    const pdf = await pdfjs.getDocument({ data: uint8Array, isEvalSupported: false, disableWorker: true, canvasFactory }).promise;
    if (pageNumber > pdf.numPages) {
      throw new Error(`Requested page ${pageNumber} exceeds total pages ${pdf.numPages}`);
    }

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
    const { canvas, context } = canvasAndContext;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      intent: 'display',
      renderInteractiveForms: false,
      annotationMode: 0,
      enableWebGL: false,
    };

    await page.render(renderContext).promise;
    return canvas.toBuffer('image/jpeg', { quality: 0.9 });

  } catch (error) {
    console.error(`[PDF-RENDERER] Canvas rendering failed for page ${pageNumber}:`, error);
    throw new Error(`Canvas rendering failed: ${error.message}`);
  }
};

const createPlaceholderImage = async (width = 1240, height = 1754) => {
  const canvas = new Canvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#cccccc';
  context.lineWidth = 2;
  context.strokeRect(20, 20, width - 40, height - 40);
  context.fillStyle = '#666666';
  context.font = 'bold 48px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('PDF Document', width / 2, height / 2 - 30);
  context.font = '24px Arial';
  context.fillText('Preview not available', width / 2, height / 2 + 30);
  return canvas.toBuffer('image/jpeg', { quality: 0.8 });
};

export const renderPdfPageToImage = async (pdfBuffer, pageNumber, scale) => {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF buffer provided for rendering.');
  }

  try {
    // Primary strategy: PDF.js + Canvas
    return await convertPDFPageWithCanvas(pdfBuffer, pageNumber, scale);
  } catch (error) {
    console.warn('[PDF-RENDERER] Primary rendering strategy failed. Falling back to placeholder.', error.message);
    try {
      // Fallback strategy: Generate a placeholder image
      return await createPlaceholderImage();
    } catch (placeholderError) {
      console.error('[PDF-RENDERER] Fallback placeholder generation also failed:', placeholderError);
      throw new Error('All PDF rendering and fallback strategies failed.');
    }
  }
};
