// Debug endpoint to isolate PDF.js + Canvas compatibility issues
import { readFileSync } from 'fs'
import { Canvas } from 'canvas'

// Dynamic import for PDF.js ES module
let pdfjsLib = null
async function initPdfJs() {
  if (!pdfjsLib) {
    try {
      // Try the ES module import
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      console.log('[DEBUG] PDF.js ES module imported successfully')
    } catch (esError) {
      console.error('[DEBUG] ES module import failed:', esError.message)
      try {
        // Fallback to CommonJS
        pdfjsLib = await import('pdfjs-dist')
        console.log('[DEBUG] PDF.js CommonJS imported successfully')
      } catch (cjsError) {
        console.error('[DEBUG] CommonJS import also failed:', cjsError.message)
        throw new Error(`Failed to import PDF.js: ES: ${esError.message}, CJS: ${cjsError.message}`)
      }
    }
    
    console.log('[DEBUG] PDF.js version:', pdfjsLib.version)
    console.log('[DEBUG] PDF.js available methods:', Object.keys(pdfjsLib))
    console.log('[DEBUG] getDocument available:', typeof pdfjsLib.getDocument)
    
    // Check if we're in Node.js environment
    if (typeof window === 'undefined') {
      console.log('[DEBUG] Running in Node.js environment')
      // In Node.js, PDF.js runs in main thread by default, no worker configuration needed
      console.log('[DEBUG] PDF.js will run in main thread (Node.js environment)')
    }
  }
  return pdfjsLib
}

// Test basic Canvas creation
const testCanvasCreation = () => {
  try {
    const canvas = new Canvas(100, 100)
    const ctx = canvas.getContext('2d')
    console.log('[DEBUG] Canvas created successfully:', {
      width: canvas.width,
      height: canvas.height,
      contextType: typeof ctx
    })
    
    // Test basic drawing
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 50, 50)
    console.log('[DEBUG] Canvas drawing test passed')
    
    // Test buffer conversion
    const buffer = canvas.toBuffer('image/jpeg')
    console.log('[DEBUG] Canvas to buffer conversion:', buffer.length, 'bytes')
    
    return true
  } catch (error) {
    console.error('[DEBUG] Canvas test failed:', error.message)
    return false
  }
}

// Test PDF.js document loading
const testPdfJsLoading = async (pdfBuffer) => {
  try {
    const pdfjs = await initPdfJs()
    console.log('[DEBUG] PDF.js initialized')
    
    // Check buffer validity
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Invalid PDF buffer: empty or null')
    }
    
    console.log('[DEBUG] PDF buffer info:', {
      type: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer),
      length: pdfBuffer.length,
      firstBytes: Array.from(pdfBuffer.slice(0, 8)).map(b => b.toString(16)).join(' ')
    })
    
    // Check PDF magic bytes
    const magicBytes = pdfBuffer.slice(0, 4).toString()
    if (!magicBytes.startsWith('%PDF')) {
      throw new Error(`Invalid PDF magic bytes: ${magicBytes}`)
    }
    console.log('[DEBUG] PDF magic bytes verified:', magicBytes)
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer)
    console.log('[DEBUG] Buffer converted to Uint8Array:', uint8Array.length, 'bytes')
    
    // Try different loading approaches
    console.log('[DEBUG] Attempting PDF.js document loading...')
    
    // Approach 1: Direct data loading
    let loadingTask
    try {
      loadingTask = pdfjs.getDocument({ 
        data: uint8Array,
        verbosity: 1  // Enable verbose logging
      })
      console.log('[DEBUG] PDF loading task created (approach 1)')
    } catch (taskError) {
      console.error('[DEBUG] Loading task creation failed:', taskError.message)
      throw taskError
    }
    
    let pdf
    try {
      pdf = await loadingTask.promise
      console.log('[DEBUG] PDF loaded successfully:', {
        numPages: pdf.numPages,
        fingerprint: pdf.fingerprint
      })
    } catch (loadError) {
      console.error('[DEBUG] PDF loading promise failed:', loadError.message)
      console.error('[DEBUG] Load error details:', {
        name: loadError.name,
        code: loadError.code,
        stack: loadError.stack
      })
      throw loadError
    }
    
    // Get first page
    let page
    try {
      page = await pdf.getPage(1)
      console.log('[DEBUG] First page loaded:', {
        pageNumber: page.pageNumber
      })
    } catch (pageError) {
      console.error('[DEBUG] Page loading failed:', pageError.message)
      throw pageError
    }
    
    // Get viewport
    let viewport
    try {
      viewport = page.getViewport({ scale: 1.0 })
      console.log('[DEBUG] Viewport:', {
        width: viewport.width,
        height: viewport.height
      })
    } catch (viewportError) {
      console.error('[DEBUG] Viewport creation failed:', viewportError.message)
      throw viewportError
    }
    
    return { pdf, page, viewport }
  } catch (error) {
    console.error('[DEBUG] PDF.js test failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    })
    return null
  }
}

// Test PDF page rendering to Canvas
const testPdfRendering = async (page, viewport) => {
  try {
    console.log('[DEBUG] Starting PDF rendering test')
    
    // Create canvas with exact viewport dimensions
    const canvas = new Canvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d')
    
    console.log('[DEBUG] Canvas created for rendering:', {
      width: canvas.width,
      height: canvas.height
    })
    
    // Check if context has required methods
    const requiredMethods = ['fillRect', 'drawImage', 'save', 'restore', 'scale', 'translate']
    const missingMethods = requiredMethods.filter(method => typeof context[method] !== 'function')
    
    if (missingMethods.length > 0) {
      console.error('[DEBUG] Canvas context missing methods:', missingMethods)
      return null
    }
    
    console.log('[DEBUG] Canvas context has all required methods')
    
    // Create render context
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    console.log('[DEBUG] Render context created')
    
    // Start rendering
    const renderTask = page.render(renderContext)
    console.log('[DEBUG] Render task started')
    
    await renderTask.promise
    console.log('[DEBUG] PDF page rendered successfully')
    
    // Convert to buffer
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    console.log('[DEBUG] Canvas converted to buffer:', buffer.length, 'bytes')
    
    return buffer
  } catch (error) {
    console.error('[DEBUG] PDF rendering failed:', error.message)
    console.error('[DEBUG] Error stack:', error.stack)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { testPdfPath } = req.body

  try {
    console.log('[DEBUG] Starting PDF + Canvas compatibility test')
    
    // Test 1: Canvas creation
    console.log('\n=== Test 1: Canvas Creation ===')
    const canvasWorking = testCanvasCreation()
    
    if (!canvasWorking) {
      return res.status(500).json({
        error: 'Canvas test failed',
        details: 'Basic Canvas creation and drawing failed'
      })
    }
    
    // Load test PDF (if provided)
    let pdfBuffer
    if (testPdfPath) {
      try {
        pdfBuffer = readFileSync(testPdfPath)
        console.log('[DEBUG] Test PDF loaded:', pdfBuffer.length, 'bytes')
      } catch (error) {
        console.error('[DEBUG] Failed to load test PDF:', error.message)
        return res.status(400).json({
          error: 'Test PDF not found',
          details: 'Could not load the specified test PDF file'
        })
      }
    } else {
      // Create a minimal PDF buffer for testing (this won't work, but let's see the error)
      console.log('[DEBUG] No test PDF provided, will test PDF.js initialization only')
    }
    
    // Test 2: PDF.js loading
    console.log('\n=== Test 2: PDF.js Initialization ===')
    if (pdfBuffer) {
      const pdfResult = await testPdfJsLoading(pdfBuffer)
      
      if (!pdfResult) {
        return res.status(500).json({
          error: 'PDF.js loading failed',
          details: 'Failed to load PDF document with PDF.js'
        })
      }
      
      // Test 3: PDF rendering
      console.log('\n=== Test 3: PDF Rendering ===')
      const imageBuffer = await testPdfRendering(pdfResult.page, pdfResult.viewport)
      
      if (!imageBuffer) {
        return res.status(500).json({
          error: 'PDF rendering failed',
          details: 'Failed to render PDF page to Canvas'
        })
      }
      
      console.log('[DEBUG] All tests passed successfully!')
      
      return res.status(200).json({
        success: true,
        message: 'PDF + Canvas compatibility test passed',
        results: {
          canvasWorking: true,
          pdfLoaded: true,
          renderingWorking: true,
          imageSize: imageBuffer.length
        }
      })
    } else {
      // Just test PDF.js initialization
      const pdfjs = await initPdfJs()
      
      return res.status(200).json({
        success: true,
        message: 'PDF.js initialization test passed',
        results: {
          canvasWorking: true,
          pdfjsVersion: pdfjs.version,
          pdfjsLoaded: true
        }
      })
    }
    
  } catch (error) {
    console.error('[DEBUG] Debug test failed:', error.message)
    console.error('[DEBUG] Error stack:', error.stack)
    
    return res.status(500).json({
      error: 'Debug test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}