// Test PDF.js + Canvas rendering
import { readFileSync } from 'fs'
import { Canvas } from 'canvas'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Testing PDF.js + Canvas rendering ===')
    
    // Step 1: Import PDF.js (use regular build, not legacy)
    console.log('Step 1: Importing PDF.js...')
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    console.log('✓ PDF.js imported successfully, version:', pdfjs.version)
    
    // Step 2: Load test PDF
    console.log('Step 2: Loading test PDF...')
    const pdfPath = '/Users/Calvin/Desktop/mjkprints/node_modules/pdf-parse/test/data/01-valid.pdf'
    const pdfBuffer = readFileSync(pdfPath)
    console.log('✓ PDF file loaded, size:', pdfBuffer.length, 'bytes')
    
    // Step 3: Convert to Uint8Array and load PDF
    console.log('Step 3: Loading PDF document...')
    const uint8Array = new Uint8Array(pdfBuffer)
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      isEvalSupported: false,
      disableWorker: true
    })
    const pdf = await loadingTask.promise
    console.log('✓ PDF loaded, pages:', pdf.numPages)
    
    // Step 4: Get first page and viewport
    console.log('Step 4: Getting first page...')
    const page = await pdf.getPage(1)
    const scale = 2.0
    const viewport = page.getViewport({ scale })
    console.log('✓ Viewport created:', {
      width: viewport.width,
      height: viewport.height,
      scale: scale
    })
    
    // Step 5: Create Canvas
    console.log('Step 5: Creating Canvas...')
    const canvas = new Canvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    console.log('✓ Canvas created:', {
      width: canvas.width,
      height: canvas.height,
      contextType: typeof context
    })
    
    // Step 6: Test Canvas context methods
    console.log('Step 6: Testing Canvas context methods...')
    const requiredMethods = ['fillRect', 'drawImage', 'save', 'restore', 'scale', 'translate', 'transform']
    const missingMethods = requiredMethods.filter(method => typeof context[method] !== 'function')
    
    if (missingMethods.length > 0) {
      throw new Error(`Canvas context missing required methods: ${missingMethods.join(', ')}`)
    }
    console.log('✓ Canvas context has all required methods')
    
    // Step 7: Render PDF page to Canvas
    console.log('Step 7: Rendering PDF page to Canvas...')
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    const renderTask = page.render(renderContext)
    await renderTask.promise
    console.log('✓ PDF page rendered to Canvas successfully!')
    
    // Step 8: Convert Canvas to image buffer
    console.log('Step 8: Converting Canvas to image buffer...')
    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    console.log('✓ Canvas converted to JPEG buffer:', imageBuffer.length, 'bytes')
    
    // Step 9: Test PNG conversion as well
    console.log('Step 9: Testing PNG conversion...')
    const pngBuffer = canvas.toBuffer('image/png')
    console.log('✓ Canvas converted to PNG buffer:', pngBuffer.length, 'bytes')
    
    console.log('=== All PDF + Canvas tests passed! ===')
    
    return res.status(200).json({
      success: true,
      message: 'PDF + Canvas rendering test passed',
      results: {
        pdfLoaded: true,
        numPages: pdf.numPages,
        canvasCreated: true,
        renderingWorked: true,
        jpegSize: imageBuffer.length,
        pngSize: pngBuffer.length,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          scale: scale
        }
      }
    })
    
  } catch (error) {
    console.error('=== PDF + Canvas test failed ===')
    console.error('Error message:', error.message)
    console.error('Error name:', error.name)
    console.error('Error stack:', error.stack)
    
    return res.status(500).json({
      error: 'PDF + Canvas test failed',
      details: error.message,
      name: error.name
    })
  }
}