// Test PDF processing with actual file from storage
import { Canvas } from 'canvas'
import { getFileUploadById, supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileId } = req.body

  if (!fileId) {
    return res.status(400).json({ error: 'File ID required' })
  }

  try {
    
    // Step 1: Get file record
    const file = await getFileUploadById(fileId)
    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }
    
      id: file.id,
      fileName: file.file_name,
      storagePath: file.storage_path,
      fileSize: file.file_size
    })
    
    // Step 2: Download from storage
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .download(file.storage_path)

    if (error) {
      throw new Error(`Storage download failed: ${error.message}`)
    }

    const arrayBuffer = await data.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    
    // Step 3: Check PDF header
    const header = pdfBuffer.slice(0, 8).toString()
    
    if (!header.startsWith('%PDF')) {
      throw new Error('Invalid PDF header: ' + header)
    }
    
    // Step 4: Import PDF.js and test document loading
    const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
    
    const uint8Array = new Uint8Array(pdfBuffer)
    const loadingTask = pdfjs.getDocument({ 
      data: uint8Array,
      isEvalSupported: false,
      disableWorker: true
    })
    
    const pdf = await loadingTask.promise
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprint
    })
    
    // Step 5: Get first page
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2.0 })
      pageNumber: page.pageNumber,
      viewport: {
        width: viewport.width,
        height: viewport.height
      }
    })
    
    // Step 6: Test Canvas rendering
    
    // Try different Canvas creation approaches
    let canvas, context
    
    try {
      // Approach 1: Standard Canvas creation
      canvas = new Canvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
      context = canvas.getContext('2d')
    } catch (canvasError) {
      console.error('Canvas creation failed:', canvasError.message)
      throw canvasError
    }
    
      width: canvas.width,
      height: canvas.height,
      contextType: typeof context,
      contextConstructor: context.constructor.name
    })
    
    // Check context methods
    const requiredMethods = [
      'fillRect', 'strokeRect', 'clearRect',
      'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc',
      'fillText', 'strokeText', 'measureText',
      'drawImage', 'createImageData', 'getImageData', 'putImageData',
      'save', 'restore', 'scale', 'rotate', 'translate', 'transform', 'setTransform',
      'globalAlpha', 'globalCompositeOperation',
      'strokeStyle', 'fillStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
      'shadowOffsetX', 'shadowOffsetY', 'shadowBlur', 'shadowColor',
      'font', 'textAlign', 'textBaseline'
    ]
    
    const availableMethods = requiredMethods.filter(method => 
      typeof context[method] !== 'undefined'
    )
    const missingMethods = requiredMethods.filter(method => 
      typeof context[method] === 'undefined'
    )
    
    
    // Check if the context has the canvas property
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    
    try {
      await page.render(renderContext).promise
    } catch (renderError) {
      console.error('Render error details:', {
        message: renderError.message,
        name: renderError.name,
        stack: renderError.stack
      })
      throw renderError
    }
    
    // Step 7: Convert to image
    const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    
    
    return res.status(200).json({
      success: true,
      message: 'Storage PDF processing test passed',
      results: {
        fileId: file.id,
        fileName: file.file_name,
        storagePath: file.storage_path,
        originalSize: file.file_size,
        downloadedSize: pdfBuffer.length,
        pdfValid: true,
        numPages: pdf.numPages,
        canvasRendered: true,
        imageSize: imageBuffer.length
      }
    })
    
  } catch (error) {
    console.error('=== Storage PDF test failed ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return res.status(500).json({
      error: 'Storage PDF test failed',
      details: error.message
    })
  }
}