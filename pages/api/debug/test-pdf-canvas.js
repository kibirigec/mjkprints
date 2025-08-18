// Test PDF.js + Canvas rendering
import { readFileSync } from 'fs'
import { Canvas } from 'canvas'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    
    // Step 1: Import PDF.js (use regular build, not legacy)
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    
    // Step 2: Load test PDF
    const pdfPath = '/Users/Calvin/Desktop/mjkprints/node_modules/pdf-parse/test/data/01-valid.pdf'
    const pdfBuffer = readFileSync(pdfPath)
    
    // Step 3: Convert to Uint8Array and load PDF
    const uint8Array = new Uint8Array(pdfBuffer)
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      isEvalSupported: false,
      disableWorker: true
    })
    const pdf = await loadingTask.promise
    
    // Step 4: Get first page and viewport
    const page = await pdf.getPage(1)
    const scale = 2.0
    const viewport = page.getViewport({ scale })
      width: viewport.width,
      height: viewport.height,
      scale: scale
    })
    
    // Step 5: Create Canvas
    const canvas = new Canvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
      width: canvas.width,
      height: canvas.height,
      contextType: typeof context
    })
    
    // Step 6: Test Canvas context methods
    const requiredMethods = ['fillRect', 'drawImage', 'save', 'restore', 'scale', 'translate', 'transform']
    const missingMethods = requiredMethods.filter(method => typeof context[method] !== 'function')
    
    if (missingMethods.length > 0) {
      throw new Error(`Canvas context missing required methods: ${missingMethods.join(', ')}`)
    }
    
    // Step 7: Render PDF page to Canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    const renderTask = page.render(renderContext)
    await renderTask.promise
    
    // Step 8: Convert Canvas to image buffer
    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    
    // Step 9: Test PNG conversion as well
    const pngBuffer = canvas.toBuffer('image/png')
    
    
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