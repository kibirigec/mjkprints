// Simple PDF.js test without complex logging
import { readFileSync } from 'fs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    
    // Step 1: Import PDF.js (try regular build instead of legacy)
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    
    // Step 1.5: Configure for Node.js (disable worker)
    if (pdfjs.GlobalWorkerOptions) {
      // Don't set to null, just don't set workerSrc at all to disable worker
    }
    
    // Step 2: Load test PDF
    const pdfPath = '/Users/Calvin/Desktop/mjkprints/node_modules/pdf-parse/test/data/01-valid.pdf'
    const pdfBuffer = readFileSync(pdfPath)
    
    // Step 3: Check PDF header  
    const header = pdfBuffer.slice(0, 8).toString()
    
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF header: ' + header)
    }
    
    // Step 4: Convert to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer)
    
    // Step 5: Create loading task (with Node.js-specific options)
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      // Disable worker explicitly for Node.js
      isEvalSupported: false,
      disableWorker: true
    })
    
    // Step 6: Load PDF document
    const pdf = await loadingTask.promise
    
    // Step 7: Get first page
    const page = await pdf.getPage(1)
    
    // Step 8: Get viewport
    const viewport = page.getViewport({ scale: 1.0 })
    
    
    return res.status(200).json({
      success: true,
      message: 'All PDF.js tests passed',
      results: {
        pdfLoaded: true,
        numPages: pdf.numPages,
        firstPageLoaded: true,
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      }
    })
    
  } catch (error) {
    console.error('=== PDF.js test failed ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    
    return res.status(500).json({
      error: 'PDF.js test failed',
      details: error.message,
      name: error.name
    })
  }
}