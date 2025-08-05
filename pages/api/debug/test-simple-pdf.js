// Simple PDF.js test without complex logging
import { readFileSync } from 'fs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Starting simple PDF.js test ===')
    
    // Step 1: Import PDF.js (try regular build instead of legacy)
    console.log('Step 1: Importing PDF.js...')
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    console.log('✓ PDF.js imported successfully, version:', pdfjs.version)
    
    // Step 1.5: Configure for Node.js (disable worker)
    console.log('Step 1.5: Configuring PDF.js for Node.js...')
    if (pdfjs.GlobalWorkerOptions) {
      // Don't set to null, just don't set workerSrc at all to disable worker
      console.log('✓ PDF.js will run without worker (main thread)')
    }
    
    // Step 2: Load test PDF
    console.log('Step 2: Loading test PDF...')
    const pdfPath = '/Users/Calvin/Desktop/mjkprints/node_modules/pdf-parse/test/data/01-valid.pdf'
    const pdfBuffer = readFileSync(pdfPath)
    console.log('✓ PDF file loaded, size:', pdfBuffer.length, 'bytes')
    
    // Step 3: Check PDF header  
    const header = pdfBuffer.slice(0, 8).toString()
    console.log('✓ PDF header:', header)
    
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF header: ' + header)
    }
    
    // Step 4: Convert to Uint8Array
    console.log('Step 4: Converting to Uint8Array...')
    const uint8Array = new Uint8Array(pdfBuffer)
    console.log('✓ Converted to Uint8Array, length:', uint8Array.length)
    
    // Step 5: Create loading task (with Node.js-specific options)
    console.log('Step 5: Creating PDF loading task...')
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      // Disable worker explicitly for Node.js
      isEvalSupported: false,
      disableWorker: true
    })
    console.log('✓ Loading task created')
    
    // Step 6: Load PDF document
    console.log('Step 6: Loading PDF document...')
    const pdf = await loadingTask.promise
    console.log('✓ PDF loaded successfully!')
    console.log('  - Pages:', pdf.numPages)
    console.log('  - Fingerprint:', pdf.fingerprint)
    
    // Step 7: Get first page
    console.log('Step 7: Getting first page...')
    const page = await pdf.getPage(1)
    console.log('✓ First page loaded, page number:', page.pageNumber)
    
    // Step 8: Get viewport
    console.log('Step 8: Getting viewport...')
    const viewport = page.getViewport({ scale: 1.0 })
    console.log('✓ Viewport created:')
    console.log('  - Width:', viewport.width)
    console.log('  - Height:', viewport.height)
    
    console.log('=== All PDF.js tests passed! ===')
    
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