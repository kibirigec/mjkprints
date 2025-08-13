import { createReadStream, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import pdfParse from 'pdf-parse'
import sharp from 'sharp'
import { Canvas, Image, DOMMatrix, DOMPoint, ImageData } from 'canvas'
import { convertPDFPageWithSystemImageMagick, checkImageMagickAvailability, getImageMagickInfo } from '../../../lib/imagemagick-convert.js'

// Simple Path2D polyfill for PDF.js compatibility in Node.js
// PDF.js uses Path2D for font rendering but falls back gracefully
class Path2D {
  constructor(path) {
    this.path = path || ''
  }
  
  addPath(path) {
    if (path && path.path) {
      this.path += path.path
    }
  }
  
  closePath() {
    this.path += 'Z'
  }
  
  moveTo(x, y) {
    this.path += `M${x},${y}`
  }
  
  lineTo(x, y) {
    this.path += `L${x},${y}`
  }
  
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`
  }
  
  quadraticCurveTo(cpx, cpy, x, y) {
    this.path += `Q${cpx},${cpy} ${x},${y}`
  }
  
  arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    // Simplified arc implementation
    this.path += `A${radius},${radius} 0 0,${anticlockwise ? 1 : 0} ${x + Math.cos(endAngle) * radius},${y + Math.sin(endAngle) * radius}`
  }
  
  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
    // Simplified ellipse implementation
    this.path += `A${radiusX},${radiusY} ${rotation} 0,${anticlockwise ? 1 : 0} ${x + Math.cos(endAngle) * radiusX},${y + Math.sin(endAngle) * radiusY}`
  }
}

// Set browser API globals IMMEDIATELY at module load time
// This ensures they're available before PDF.js tries to access them during import
console.log('[PDF-PROCESS] Setting browser API globals at module load...')
try {
  if (typeof global !== 'undefined') {
    global.Canvas = Canvas
    global.Image = Image
    global.DOMMatrix = DOMMatrix
    global.DOMPoint = DOMPoint
    global.ImageData = ImageData
    global.Path2D = Path2D
    
    // Add additional Canvas API methods that PDF.js expects
    // These are needed for proper clipping and path operations
    global.createCanvas = (width, height) => new Canvas(width, height)
    global.loadImage = Image.loadImage || Image.from
    
    console.log('[PDF-PROCESS] ✅ Browser API globals set successfully:', {
      Canvas: typeof global.Canvas,
      Image: typeof global.Image,
      DOMMatrix: typeof global.DOMMatrix,
      DOMPoint: typeof global.DOMPoint,
      ImageData: typeof global.ImageData,
      Path2D: typeof global.Path2D,
      createCanvas: typeof global.createCanvas,
      loadImage: typeof global.loadImage
    })
  }
} catch (error) {
  console.error('[PDF-PROCESS] ❌ Failed to set browser API globals:', error)
}

// NodeCanvasFactory for PDF.js compatibility in Node.js
// This ensures PDF.js uses the correct Canvas objects for rendering
class NodeCanvasFactory {
  create(width, height) {
    const canvas = new Canvas(Math.ceil(width), Math.ceil(height))
    const context = canvas.getContext('2d')
    
    console.log(`[PDF-PROCESS] NodeCanvasFactory creating canvas: ${width}x${height}`)
    
    // Initialize canvas with white background (PDF.js expects this)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    // Reset to default drawing state
    context.fillStyle = '#000000'
    context.strokeStyle = '#000000'
    context.font = '10px sans-serif'
    context.textAlign = 'start'
    context.textBaseline = 'alphabetic'
    context.globalAlpha = 1.0
    context.globalCompositeOperation = 'source-over'
    
    console.log(`[PDF-PROCESS] Canvas initialized with white background: ${canvas.width}x${canvas.height}`)
    console.log(`[PDF-PROCESS] Initial context state - fillStyle: ${context.fillStyle}, font: ${context.font}`)
    
    // Patch Canvas context to support PDF.js requirements
    this._patchCanvasContext(context)
    
    return {
      canvas,
      context
    }
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = Math.ceil(width)
    canvasAndContext.canvas.height = Math.ceil(height)
    console.log(`[PDF-PROCESS] NodeCanvasFactory reset canvas: ${width}x${height}`)
  }

  destroy(canvasAndContext) {
    // Canvas cleanup - in Node.js, let garbage collection handle it
    canvasAndContext.canvas.width = 0
    canvasAndContext.canvas.height = 0
    console.log('[PDF-PROCESS] NodeCanvasFactory destroyed canvas')
  }

  _patchCanvasContext(context) {
    console.log('[PDF-PROCESS] Patching Canvas context for PDF.js compatibility')
    
    // PDF.js expects clip to have a rect method for clipping operations
    if (context.clip && !context.clip.rect) {
      const originalClip = context.clip.bind(context)
      context.clip = function(pathOrFillRule, fillRule) {
        return originalClip(pathOrFillRule, fillRule)
      }
      // Add rect method to clip function
      context.clip.rect = function(x, y, width, height) {
        context.beginPath()
        context.rect(x, y, width, height)
        context.clip()
      }
    }

    // Ensure save/restore work properly for clipping contexts
    const originalSave = context.save.bind(context)
    const originalRestore = context.restore.bind(context)
    
    context.save = function() {
      return originalSave()
    }
    
    context.restore = function() {
      return originalRestore()
    }

    // Add missing Canvas API methods that PDF.js expects
    if (!context.createImageData) {
      context.createImageData = function(width, height) {
        console.log(`[PDF-PROCESS] Creating ImageData: ${width}x${height}`)
        
        // Create proper ImageData object with specified dimensions
        if (typeof ImageData !== 'undefined') {
          // Use global ImageData constructor if available
          return new ImageData(width, height)
        } else {
          // Fallback: create ImageData manually
          const data = new Uint8ClampedArray(width * height * 4)
          // Initialize with transparent pixels (0,0,0,0)
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 0     // R
            data[i + 1] = 0 // G
            data[i + 2] = 0 // B
            data[i + 3] = 0 // A (transparent)
          }
          
          return {
            data: data,
            width: width,
            height: height
          }
        }
      }
    }

    // Ensure proper text measurement
    if (!context.measureText || typeof context.measureText !== 'function') {
      context.measureText = function(text) {
        return { width: text.length * 8 } // Rough approximation
      }
    }

    // Add proper font handling with better initialization
    if (!context._fontInitialized) {
      console.log('[PDF-PROCESS] Initializing font handling')
      
      // Store original font property
      let currentFont = context.font || '10px sans-serif'
      
      // Ensure font property works correctly
      Object.defineProperty(context, 'font', {
        get: function() {
          return this._currentFont || '10px sans-serif'
        },
        set: function(value) {
          console.log(`[PDF-PROCESS] Setting font: ${value}`)
          this._currentFont = value
          
          // Try to apply the font to the underlying canvas context
          try {
            // Set font directly on canvas context
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(context), 'font')
            if (descriptor && descriptor.set) {
              descriptor.set.call(context, value)
            }
          } catch (error) {
            console.log('[PDF-PROCESS] Font setting failed, using fallback:', error.message)
            this._currentFont = '10px sans-serif'
          }
        }
      })
      
      // Initialize with default font
      context.font = currentFont
      context._fontInitialized = true
      
      // Ensure fillStyle and strokeStyle are properly initialized
      if (!context.fillStyle) {
        context.fillStyle = '#000000' // Default to black text
      }
      if (!context.strokeStyle) {
        context.strokeStyle = '#000000' // Default to black stroke
      }
      
      console.log(`[PDF-PROCESS] Font handling initialized - font: ${context.font}, fillStyle: ${context.fillStyle}`)
    }

    // Add comprehensive error handling for drawing operations
    const originalDrawImage = context.drawImage?.bind(context)
    if (originalDrawImage) {
      context.drawImage = function(...args) {
        try {
          return originalDrawImage(...args)
        } catch (error) {
          console.log('[PDF-PROCESS] DrawImage failed:', error.message)
          // Don't throw, just skip the drawing operation
        }
      }
    }

    // Add error handling for fill operations
    const originalFill = context.fill?.bind(context)
    if (originalFill) {
      context.fill = function(...args) {
        try {
          return originalFill(...args)
        } catch (error) {
          console.log('[PDF-PROCESS] Fill operation failed:', error.message)
        }
      }
    }

    // Add error handling for stroke operations
    const originalStroke = context.stroke?.bind(context)
    if (originalStroke) {
      context.stroke = function(...args) {
        try {
          return originalStroke(...args)
        } catch (error) {
          console.log('[PDF-PROCESS] Stroke operation failed:', error.message)
        }
      }
    }

    console.log('[PDF-PROCESS] Canvas context patching completed')
    return context
  }
}
import { 
  getFileUploadById, 
  updateFileProcessingStatus, 
  updateFileWithProcessingResults,
  uploadFileToStorage,
  supabase
} from '../../../lib/supabase.js'

// Dynamic import for PDF.js ES module
let pdfjsLib = null
async function initPdfJs() {
  if (!pdfjsLib) {
    try {
      // Use legacy build specifically designed for Node.js environments
      // This resolves the DOMMatrix timing issue where globals are needed during import
      console.log('[PDF-PROCESS] Initializing PDF.js legacy build for Node.js compatibility...')
      console.log('[PDF-PROCESS] Environment info:', {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      })
      
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      console.log('[PDF-PROCESS] ✅ PDF.js legacy build initialized successfully, version:', pdfjsLib.version)
      
      // Configure worker for serverless environments
      // Use CDN worker URL as fallback for serverless environments where local worker files aren't available
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      console.log('[PDF-PROCESS] ✅ PDF.js worker configured with CDN worker for serverless compatibility')
      
      // Validate that all required browser APIs are available
      const requiredAPIs = ['Canvas', 'Image', 'DOMMatrix', 'DOMPoint', 'ImageData', 'Path2D']
      const missingAPIs = requiredAPIs.filter(api => typeof global[api] === 'undefined')
      
      if (missingAPIs.length > 0) {
        console.error('[PDF-PROCESS] ❌ Missing required browser APIs:', missingAPIs)
        throw new Error(`Missing required browser APIs: ${missingAPIs.join(', ')}. These APIs are required for PDF.js Node.js compatibility.`)
      }
      
      // Test canvas functionality
      try {
        const testCanvas = new global.Canvas(10, 10)
        const testContext = testCanvas.getContext('2d')
        console.log('[PDF-PROCESS] ✅ Canvas functionality test passed')
      } catch (canvasError) {
        console.error('[PDF-PROCESS] ❌ Canvas functionality test failed:', canvasError.message)
        throw new Error(`Canvas functionality test failed: ${canvasError.message}`)
      }
      
      console.log('[PDF-PROCESS] ✅ All required browser APIs validated successfully')
      
    } catch (error) {
      console.error('[PDF-PROCESS] ❌ Failed to initialize PDF.js:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      })
      throw new Error(`PDF.js initialization failed: ${error.message}`)
    }
  }
  return pdfjsLib
}

const PREVIEW_SIZES = {
  small: { width: 200, height: 283 }, // A4 ratio at 200px width
  medium: { width: 400, height: 566 }, // A4 ratio at 400px width  
  large: { width: 800, height: 1131 }  // A4 ratio at 800px width
}

const TEMP_DIR = '/tmp/pdf-processing'

// Check system ImageMagick availability for PDF conversion
const checkSystemImageMagickAvailability = async () => {
  console.log('[PDF-PROCESS] Checking system ImageMagick availability...')
  
  try {
    const isAvailable = await checkImageMagickAvailability()
    const info = await getImageMagickInfo()
    
    console.log('[PDF-PROCESS] ImageMagick status:', {
      available: isAvailable,
      version: info.version,
      supportsPDF: info.supportsPDF,
      supportsJPEG: info.supportsJPEG
    })
    
    return {
      imagemagick: isAvailable,
      info: info
    }
  } catch (error) {
    console.error('[PDF-PROCESS] ImageMagick availability check failed:', error.message)
    return {
      imagemagick: false,
      error: error.message
    }
  }
}

// Ensure temp directory exists
const ensureTempDir = () => {
  try {
    mkdirSync(TEMP_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }
}

// Download file from Supabase storage to local temp for processing
const downloadFileFromStorage = async (storagePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('mjk-prints-storage')
      .download(storagePath)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    const arrayBuffer = await data.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    throw new Error(`Storage download failed: ${error.message}`)
  }
}

// Extract detailed PDF metadata
const extractPDFMetadata = async (pdfBuffer) => {
  try {
    const pdfData = await pdfParse(pdfBuffer)
    
    return {
      pageCount: pdfData.numpages,
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      creator: pdfData.info?.Creator || null,
      producer: pdfData.info?.Producer || null,
      creationDate: pdfData.info?.CreationDate || null,
      modificationDate: pdfData.info?.ModDate || null,
      keywords: pdfData.info?.Keywords || null,
      subject: pdfData.info?.Subject || null,
      textContent: pdfData.text ? pdfData.text.substring(0, 1000) : null // First 1000 chars
    }
  } catch (error) {
    throw new Error(`PDF metadata extraction failed: ${error.message}`)
  }
}

// Get PDF page dimensions
const getPDFDimensions = async (pdfBuffer) => {
  try {
    const pdfjs = await initPdfJs()
    
    // Convert Buffer to Uint8Array for PDF.js compatibility
    const uint8Array = new Uint8Array(pdfBuffer)
    console.log(`[PDF-PROCESS] Extracting dimensions from PDF (${uint8Array.length} bytes)`)
    
    let pdf
    try {
      pdf = await pdfjs.getDocument({ 
        data: uint8Array,
        isEvalSupported: false,
        disableWorker: true,
        canvasFactory: new NodeCanvasFactory()
      }).promise
      console.log(`[PDF-PROCESS] ✅ PDF document loaded for dimensions extraction`)
    } catch (loadError) {
      console.error(`[PDF-PROCESS] ❌ PDF document loading failed during dimensions extraction:`, {
        message: loadError.message,
        stack: loadError.stack?.split('\n').slice(0, 3).join('\n')
      })
      throw new Error(`PDF document loading failed: ${loadError.message}`)
    }
    
    const page = await pdf.getPage(1) // Get first page
    const viewport = page.getViewport({ scale: 1.0 })
    
    return {
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height
    }
  } catch (error) {
    console.error('[PDF-PROCESS] PDF dimensions extraction error:', {
      errorMessage: error.message,
      errorStack: error.stack
    })
    throw new Error(`PDF dimensions extraction failed: ${error.message}`)
  }
}

// PDF-to-image conversion using magick-wasm (Strategy 1 - Most Reliable)
// This replaces the problematic pdf-poppler implementation

// System-based ImageMagick conversion removed - replaced by magick-wasm

// Convert PDF page to image buffer with multiple fallback strategies
const convertPDFPageToImage = async (pdfBuffer, pageNumber = 1, scale = 2.0, magickAvailable = false) => {
  console.log(`[PDF-PROCESS] ======= STARTING PDF TO IMAGE CONVERSION =======`)
  console.log(`[PDF-PROCESS] Page: ${pageNumber}, Scale: ${scale}, Buffer: ${pdfBuffer.length} bytes, ImageMagick: ${magickAvailable}`)
  
  // Validate inputs
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF buffer provided')
  }
  
  if (scale <= 0 || scale > 5.0) {
    console.log(`[PDF-PROCESS] Scale ${scale} is out of safe range, adjusting to 2.0`)
    scale = 2.0
  }
  
  // Define strategies in order of preference
  const strategies = []
  
  // Primary strategy: system ImageMagick (most reliable for PDF conversion)
  if (magickAvailable) {
    strategies.push({ name: 'system-imagemagick', func: convertPDFPageWithSystemImageMagick })
  }
  
  // Fallback strategies: PDF.js rendering
  strategies.push({ name: 'PDF.js + Canvas', func: convertPDFPageWithCanvas })
  strategies.push({ name: 'Simplified PDF.js', func: convertPDFPageSimplified })
  strategies.push({ name: 'Basic Canvas', func: createBasicCanvasImage })
  strategies.push({ name: 'Placeholder', func: createPlaceholderImage })
  
  console.log(`[PDF-PROCESS] Available conversion strategies: ${strategies.map(s => s.name).join(', ')}`)
  
  let lastError = null
  let strategyResults = []
  
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i]
    const strategyStart = Date.now()
    
    try {
      console.log(`[PDF-PROCESS] ======= ATTEMPTING STRATEGY ${i + 1}: ${strategy.name.toUpperCase()} =======`)
      
      // All strategies now use the same parameter format
      const result = await strategy.func(pdfBuffer, pageNumber, scale)
      const strategyTime = Date.now() - strategyStart
      
      console.log(`[PDF-PROCESS] ✅ Strategy ${i + 1} (${strategy.name}) SUCCESS in ${strategyTime}ms`)
      console.log(`[PDF-PROCESS] Result buffer size: ${result.length} bytes`)
      
      // Validate result
      if (result.length < 1000) {
        console.warn(`[PDF-PROCESS] ⚠️  Strategy ${i + 1} produced small buffer (${result.length} bytes)`)
      }
      
      strategyResults.push({
        strategy: strategy.name,
        success: true,
        time: strategyTime,
        bufferSize: result.length
      })
      
      console.log(`[PDF-PROCESS] ======= CONVERSION SUCCESSFUL =======`)
      return result
      
    } catch (error) {
      const strategyTime = Date.now() - strategyStart
      
      console.error(`[PDF-PROCESS] ❌ Strategy ${i + 1} (${strategy.name}) FAILED in ${strategyTime}ms:`, {
        message: error.message,
        name: error.name,
        pageNumber,
        scale,
        stack: error.stack?.substring(0, 300)
      })
      
      strategyResults.push({
        strategy: strategy.name,
        success: false,
        time: strategyTime,
        error: error.message
      })
      
      lastError = error
      
      // Continue to next strategy
      continue
    }
  }
  
  // If all strategies failed
  console.error(`[PDF-PROCESS] ❌ ALL STRATEGIES FAILED`)
  console.error(`[PDF-PROCESS] Strategy Summary:`, strategyResults)
  throw new Error(`All PDF rendering strategies failed. Last error: ${lastError?.message || 'Unknown error'}`)
}

// PDF.js + Canvas rendering (works for simple PDFs)
const convertPDFPageWithCanvas = async (pdfBuffer, pageNumber, scale) => {
  console.log(`[PDF-PROCESS] Starting full Canvas rendering for page ${pageNumber}`)
  
  try {
    const pdfjs = await initPdfJs()
    const uint8Array = new Uint8Array(pdfBuffer)
    const canvasFactory = new NodeCanvasFactory()
    
    console.log(`[PDF-PROCESS] Loading PDF document (${uint8Array.length} bytes)`)
    console.log(`[PDF-PROCESS] PDF.js getDocument options:`, {
      dataLength: uint8Array.length,
      isEvalSupported: false,
      disableWorker: true,
      hasCanvasFactory: !!canvasFactory
    })
    
    let pdf
    try {
      pdf = await pdfjs.getDocument({ 
        data: uint8Array,
        isEvalSupported: false,
        disableWorker: true,
        canvasFactory: canvasFactory
      }).promise
      console.log(`[PDF-PROCESS] ✅ PDF document loaded successfully`)
    } catch (loadError) {
      console.error(`[PDF-PROCESS] ❌ PDF document loading failed:`, {
        message: loadError.message,
        stack: loadError.stack?.split('\n').slice(0, 3).join('\n')
      })
      throw new Error(`PDF document loading failed: ${loadError.message}`)
    }
    
    console.log(`[PDF-PROCESS] PDF loaded, total pages: ${pdf.numPages}`)
    
    if (pageNumber > pdf.numPages) {
      throw new Error(`Requested page ${pageNumber} exceeds total pages ${pdf.numPages}`)
    }
    
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    
    console.log(`[PDF-PROCESS] Page ${pageNumber} viewport: ${viewport.width}x${viewport.height}`)

    // Use NodeCanvasFactory to create canvas (fixes "Image or Canvas expected" error)
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)
    const { canvas, context } = canvasAndContext
    
    console.log(`[PDF-PROCESS] Canvas created successfully: ${canvas.width}x${canvas.height}`)
    console.log(`[PDF-PROCESS] Canvas context type:`, context.constructor.name)
    
    // Check canvas context capabilities
    console.log(`[PDF-PROCESS] Canvas context capabilities:`, {
      drawImage: typeof context.drawImage,
      fillRect: typeof context.fillRect,
      fillStyle: typeof context.fillStyle,
      save: typeof context.save,
      restore: typeof context.restore,
      clip: typeof context.clip,
      transform: typeof context.transform
    })

    // Initialize canvas context state before rendering
    console.log(`[PDF-PROCESS] Pre-render context initialization`)
    context.save() // Save initial state
    
    // Set up proper rendering environment
    context.fillStyle = '#000000' // Black text/shapes by default
    context.strokeStyle = '#000000' // Black strokes
    context.font = '12px Arial, sans-serif' // Readable default font
    context.textAlign = 'start'
    context.textBaseline = 'alphabetic'
    context.globalAlpha = 1.0
    context.globalCompositeOperation = 'source-over'
    context.lineCap = 'butt'
    context.lineJoin = 'miter'
    context.lineWidth = 1
    
    console.log(`[PDF-PROCESS] Context state set - fillStyle: ${context.fillStyle}, font: ${context.font}`)

    // Render PDF page to canvas with enhanced configuration
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      // Enhanced rendering options for Node.js compatibility
      intent: 'display', // Display intent for screen rendering
      renderInteractiveForms: false, // Disable interactive forms
      annotationMode: 0, // No annotations (PDF.AnnotationMode.DISABLE)
      enableWebGL: false, // Disable WebGL in Node.js
      // Ensure proper text rendering
      textLayerMode: 0, // No text layer (we want text rendered to canvas)
      // Background handling
      background: null, // Let PDF content define background
      // Optional content configuration
      optionalContentConfigPromise: null
    }

  console.log(`[PDF-PROCESS] Rendering page ${pageNumber} with viewport: ${viewport.width}x${viewport.height}, scale: ${scale}`)
  console.log(`[PDF-PROCESS] Render context:`, {
    viewport: `${viewport.width}x${viewport.height}`,
    intent: renderContext.intent,
    renderInteractiveForms: renderContext.renderInteractiveForms,
    annotationMode: renderContext.annotationMode,
    background: renderContext.background
  })
  
  try {
    console.log(`[PDF-PROCESS] Starting page.render() call...`)
    console.log(`[PDF-PROCESS] Pre-render canvas state:`)
    console.log(`[PDF-PROCESS] - Canvas: ${canvas.width}x${canvas.height}`)
    console.log(`[PDF-PROCESS] - FillStyle: ${context.fillStyle}`)
    console.log(`[PDF-PROCESS] - Font: ${context.font}`)
    
    const renderPromise = page.render(renderContext)
    await renderPromise.promise
    
    console.log(`[PDF-PROCESS] Page ${pageNumber} rendered successfully`)
    
    // Restore context state after rendering
    context.restore()
    
    console.log(`[PDF-PROCESS] Post-render canvas state:`)
    console.log(`[PDF-PROCESS] - Canvas: ${canvas.width}x${canvas.height}`)
    console.log(`[PDF-PROCESS] - FillStyle: ${context.fillStyle}`)
    console.log(`[PDF-PROCESS] - Font: ${context.font}`)
    
    // Comprehensive Canvas content analysis
    console.log(`[PDF-PROCESS] ======= CANVAS CONTENT ANALYSIS =======`)
    
    // Sample multiple areas of the canvas
    const sampleSize = Math.min(20, canvas.width, canvas.height)
    const centerX = Math.floor(canvas.width / 2)
    const centerY = Math.floor(canvas.height / 2)
    
    // Sample corners and center
    const samples = [
      { name: 'top-left', x: 0, y: 0 },
      { name: 'top-right', x: canvas.width - sampleSize, y: 0 },
      { name: 'center', x: centerX - sampleSize/2, y: centerY - sampleSize/2 },
      { name: 'bottom-left', x: 0, y: canvas.height - sampleSize },
      { name: 'bottom-right', x: canvas.width - sampleSize, y: canvas.height - sampleSize }
    ]
    
    let totalNonWhitePixels = 0
    let totalPixels = 0
    
    for (const sample of samples) {
      try {
        const imageData = context.getImageData(sample.x, sample.y, sampleSize, sampleSize)
        let nonWhitePixels = 0
        let uniqueColors = new Set()
        
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i]
          const g = imageData.data[i + 1] 
          const b = imageData.data[i + 2]
          const a = imageData.data[i + 3]
          
          const colorKey = `${r},${g},${b},${a}`
          uniqueColors.add(colorKey)
          
          // Check if pixel is not pure white (255,255,255,255)
          if (!(r === 255 && g === 255 && b === 255 && a === 255)) {
            nonWhitePixels++
            totalNonWhitePixels++
          }
          totalPixels++
        }
        
        console.log(`[PDF-PROCESS] Sample ${sample.name} (${sample.x},${sample.y}): ${nonWhitePixels}/${imageData.data.length/4} non-white pixels, ${uniqueColors.size} unique colors`)
        
        // Log some unique colors found
        if (uniqueColors.size > 1) {
          const colorArray = Array.from(uniqueColors).slice(0, 5)
          console.log(`[PDF-PROCESS] Sample ${sample.name} colors:`, colorArray)
        }
      } catch (sampleError) {
        console.error(`[PDF-PROCESS] Failed to sample ${sample.name}:`, sampleError.message)
      }
    }
    
    const contentPercentage = totalPixels > 0 ? (totalNonWhitePixels / totalPixels * 100).toFixed(2) : 0
    console.log(`[PDF-PROCESS] Overall canvas analysis:`)
    console.log(`[PDF-PROCESS] - Canvas size: ${canvas.width}x${canvas.height}`)
    console.log(`[PDF-PROCESS] - Total sampled pixels: ${totalPixels}`)
    console.log(`[PDF-PROCESS] - Non-white pixels: ${totalNonWhitePixels}`)
    console.log(`[PDF-PROCESS] - Content percentage: ${contentPercentage}%`)
    console.log(`[PDF-PROCESS] - Has meaningful content: ${totalNonWhitePixels > 10}`)
    
    // Additional Canvas state inspection
    console.log(`[PDF-PROCESS] Canvas context state:`)
    console.log(`[PDF-PROCESS] - fillStyle: ${context.fillStyle}`)
    console.log(`[PDF-PROCESS] - strokeStyle: ${context.strokeStyle}`)
    console.log(`[PDF-PROCESS] - font: ${context.font}`)
    console.log(`[PDF-PROCESS] - textAlign: ${context.textAlign}`)
    console.log(`[PDF-PROCESS] - globalAlpha: ${context.globalAlpha}`)
    console.log(`[PDF-PROCESS] =======================================`)
    
  } catch (renderError) {
    console.error(`[PDF-PROCESS] Page ${pageNumber} render error:`, renderError.message)
    // Try to render with fallback settings
    const fallbackContext = {
      canvasContext: context,
      viewport: viewport,
      intent: 'print', // Try print intent as fallback
      renderInteractiveForms: false,
      annotationMode: 0
    }
    
    try {
      console.log(`[PDF-PROCESS] Attempting fallback render with print intent...`)
      await page.render(fallbackContext).promise
      console.log(`[PDF-PROCESS] Page ${pageNumber} rendered with fallback settings`)
      
      // Check fallback canvas content
      const fallbackImageData = context.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height))
      const fallbackHasContent = fallbackImageData.data.some(pixel => pixel !== 255)
      console.log(`[PDF-PROCESS] Fallback canvas content check - hasContent: ${fallbackHasContent}`)
      
    } catch (fallbackError) {
      console.error(`[PDF-PROCESS] Fallback render also failed:`, fallbackError.message)
      throw renderError // Throw the original error
    }
  }
  
  // Validate canvas has meaningful content before converting to buffer
  if (totalNonWhitePixels < 10) {
    console.warn(`[PDF-PROCESS] WARNING: Canvas appears to be mostly empty (${totalNonWhitePixels} non-white pixels)`)
    
    // Try to manually draw some test content to verify Canvas is working
    console.log(`[PDF-PROCESS] Testing Canvas functionality...`)
    context.save()
    context.fillStyle = '#ff0000' // Red
    context.fillRect(50, 50, 100, 100)
    context.fillStyle = '#000000' // Black
    context.font = '20px Arial'
    context.fillText('TEST', 60, 100)
    
    // Check if test content appears
    const testImageData = context.getImageData(60, 60, 50, 50)
    const testHasContent = testImageData.data.some(pixel => pixel !== 255)
    console.log(`[PDF-PROCESS] Canvas test draw result: ${testHasContent ? 'SUCCESS - Canvas working' : 'FAILED - Canvas not working'}`)
    
    context.restore()
    
    if (!testHasContent) {
      throw new Error('Canvas rendering is not working - test draw failed')
    }
  }

  // Final canvas state check before returning buffer
  console.log(`[PDF-PROCESS] Converting canvas to JPEG buffer...`)
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
  console.log(`[PDF-PROCESS] JPEG buffer created: ${buffer.length} bytes`)
  
  // Additional debug: Check if buffer is a valid image (basic check)
  const isValidImageHeader = buffer.length > 10 && buffer[0] === 0xFF && buffer[1] === 0xD8 // JPEG header
  console.log(`[PDF-PROCESS] Buffer validation - Valid JPEG header: ${isValidImageHeader}, Size: ${buffer.length} bytes`)
  
  // Warn if buffer seems unusually small (likely empty/white image)
  if (buffer.length < 5000) {
    console.warn(`[PDF-PROCESS] WARNING: JPEG buffer is very small (${buffer.length} bytes) - likely empty/white image`)
  }
  
  return buffer
  
  } catch (error) {
    console.error(`[PDF-PROCESS] convertPDFPageWithCanvas failed:`, {
      message: error.message,
      name: error.name,
      pageNumber,
      scale,
      bufferSize: pdfBuffer.length
    })
    throw error
  }
}

// Simplified PDF rendering (skip complex elements)
const convertPDFPageSimplified = async (pdfBuffer, pageNumber, scale) => {
  console.log(`[PDF-PROCESS] ======= STARTING SIMPLIFIED PDF RENDERING =======`)
  console.log(`[PDF-PROCESS] Page: ${pageNumber}, Scale: ${scale}, Buffer: ${pdfBuffer.length} bytes`)
  
  try {
    const pdfjs = await initPdfJs()
    const uint8Array = new Uint8Array(pdfBuffer)
    const canvasFactory = new NodeCanvasFactory()
    
    console.log(`[PDF-PROCESS] Loading PDF document...`)
    let pdf
    try {
      pdf = await pdfjs.getDocument({ 
        data: uint8Array,
        isEvalSupported: false,
        disableWorker: true,
        canvasFactory: canvasFactory
      }).promise
      console.log(`[PDF-PROCESS] ✅ PDF document loaded successfully`)
    } catch (loadError) {
      console.error(`[PDF-PROCESS] ❌ PDF document loading failed:`, {
        message: loadError.message,
        stack: loadError.stack?.split('\n').slice(0, 3).join('\n')
      })
      throw new Error(`PDF document loading failed: ${loadError.message}`)
    }
    
    console.log(`[PDF-PROCESS] PDF loaded, getting page ${pageNumber}...`)
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    console.log(`[PDF-PROCESS] Page viewport: ${viewport.width}x${viewport.height}`)

    // Use NodeCanvasFactory to create canvas with white background
    const canvasAndContext = canvasFactory.create(viewport.width, viewport.height)
    const { canvas, context } = canvasAndContext
    
    console.log(`[PDF-PROCESS] Canvas created: ${canvas.width}x${canvas.height}`)
    
    // Fill with white background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)

    // Try to render only text and simple graphics (skip images)
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      // Add intent to skip problematic elements
      intent: 'print',
      renderInteractiveForms: false,
      annotationMode: 0, // Disable annotations
      optionalContentConfigPromise: null, // Skip optional content
      background: 'white'
    }

    console.log(`[PDF-PROCESS] Attempting simplified render for page ${pageNumber}`)
    console.log(`[PDF-PROCESS] Simplified render context:`, {
      viewport: `${viewport.width}x${viewport.height}`,
      intent: renderContext.intent,
      background: renderContext.background
    })

    try {
      await page.render(renderContext).promise
      console.log(`[PDF-PROCESS] ✅ Simplified render successful for page ${pageNumber}`)
      
      // Check if simplified canvas has content
      const imageData = context.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height))
      const hasContent = imageData.data.some(pixel => pixel !== 255)
      console.log(`[PDF-PROCESS] Simplified canvas content check - hasContent: ${hasContent}`)
      
    } catch (renderError) {
      // If rendering fails, at least return a white canvas with some indication
      console.warn(`[PDF-PROCESS] ⚠️  Simplified render failed, creating basic white canvas: ${renderError.message}`)
      console.log(`[PDF-PROCESS] Simplified render error details:`, {
        name: renderError.name,
        message: renderError.message,
        stack: renderError.stack?.substring(0, 200)
      })
      
      // Add some basic indication that this is a PDF
      try {
        context.fillStyle = '#cccccc'
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
        context.fillStyle = '#666666'
        context.font = '24px Arial'
        context.textAlign = 'center'
        context.fillText('PDF Content', canvas.width / 2, canvas.height / 2)
      } catch (drawError) {
        console.warn(`[PDF-PROCESS] Could not add fallback text:`, drawError.message)
      }
    }

    console.log(`[PDF-PROCESS] Converting simplified canvas to JPEG buffer...`)
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    console.log(`[PDF-PROCESS] ✅ Simplified JPEG buffer created: ${buffer.length} bytes`)
    
    return buffer
    
  } catch (error) {
    console.error(`[PDF-PROCESS] ❌ Simplified PDF rendering completely failed:`, {
      message: error.message,
      name: error.name,
      pageNumber,
      scale,
      bufferSize: pdfBuffer.length
    })
    throw error
  }
}

// Create basic canvas image without PDF.js (emergency fallback)
const createBasicCanvasImage = async (pdfBuffer, pageNumber, scale = 2.0) => {
  console.log(`[PDF-PROCESS] ======= CREATING BASIC CANVAS IMAGE =======`)
  console.log(`[PDF-PROCESS] Page: ${pageNumber}, Scale: ${scale}`)
  
  try {
    // Create a reasonable sized canvas based on scale
    const baseWidth = 612  // Standard letter width in points
    const baseHeight = 792 // Standard letter height in points
    const width = Math.round(baseWidth * scale * 0.75) // Convert points to pixels (72 DPI to ~150 DPI)
    const height = Math.round(baseHeight * scale * 0.75)
    
    console.log(`[PDF-PROCESS] Creating basic canvas: ${width}x${height}`)
    
    const canvas = new Canvas(width, height)
    const context = canvas.getContext('2d')
    
    // White background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    
    // Add subtle border
    context.strokeStyle = '#e0e0e0'
    context.lineWidth = 1
    context.strokeRect(0, 0, width, height)
    
    // Add document icon
    const iconSize = Math.min(width, height) * 0.3
    const centerX = width / 2
    const centerY = height / 2
    
    // Document outline
    context.strokeStyle = '#cccccc'
    context.lineWidth = 2
    context.strokeRect(centerX - iconSize/2, centerY - iconSize/2, iconSize, iconSize * 1.3)
    
    // Document lines (simulate text)
    context.strokeStyle = '#dddddd'
    context.lineWidth = 1
    const lineSpacing = iconSize * 0.08
    for (let i = 0; i < 8; i++) {
      const y = (centerY - iconSize/2) + (iconSize * 0.2) + (i * lineSpacing)
      const startX = centerX - iconSize/2 + iconSize * 0.1
      const endX = centerX + iconSize/2 - iconSize * 0.1
      context.beginPath()
      context.moveTo(startX, y)
      context.lineTo(endX - (i % 3 === 2 ? iconSize * 0.3 : 0), y) // Vary line lengths
      context.stroke()
    }
    
    // Add subtle text
    try {
      context.fillStyle = '#888888'
      context.font = `${Math.round(iconSize * 0.08)}px Arial`
      context.textAlign = 'center'
      context.fillText('PDF Document', centerX, centerY + iconSize * 0.8)
      context.font = `${Math.round(iconSize * 0.06)}px Arial`
      context.fillText(`Page ${pageNumber}`, centerX, centerY + iconSize * 0.9)
    } catch (textError) {
      console.warn(`[PDF-PROCESS] Text rendering failed in basic canvas:`, textError.message)
    }
    
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 })
    console.log(`[PDF-PROCESS] ✅ Basic canvas image created: ${buffer.length} bytes`)
    return buffer
    
  } catch (error) {
    console.error(`[PDF-PROCESS] ❌ Basic canvas creation failed:`, error.message)
    throw error
  }
}

// Create placeholder image with PDF information
const createPlaceholderImage = async (pdfBuffer, pageNumber) => {
  console.log(`[PDF-PROCESS] Creating placeholder image for page ${pageNumber}`)
  
  try {
    // Standard A4 dimensions at 150 DPI
    const width = 1240
    const height = 1754
    
    const canvas = new Canvas(width, height)
    const context = canvas.getContext('2d')
    
    console.log(`[PDF-PROCESS] Placeholder canvas created: ${width}x${height}`)
    
    // White background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    
    // Add border
    context.strokeStyle = '#cccccc'
    context.lineWidth = 2
    context.strokeRect(20, 20, width - 40, height - 40)
    
    // Add placeholder text
    context.fillStyle = '#666666'
    context.font = 'bold 48px Arial'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    
    const centerX = width / 2
    const centerY = height / 2
    
    // Add text with error handling
    try {
      context.fillText('PDF Document', centerX, centerY - 60)
      context.font = '32px Arial'
      context.fillText(`Page ${pageNumber}`, centerX, centerY)
      context.font = '24px Arial'
      context.fillText('Preview not available', centerX, centerY + 40)
      context.fillText('Original PDF will be delivered', centerX, centerY + 80)
    } catch (textError) {
      console.warn(`[PDF-PROCESS] Text rendering failed, creating simple placeholder:`, textError.message)
      // Simple fallback - just fill with gray
      context.fillStyle = '#f0f0f0'
      context.fillRect(100, 100, width - 200, height - 200)
    }
    
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 })
    console.log(`[PDF-PROCESS] ✅ Placeholder image created: ${buffer.length} bytes`)
    return buffer
    
  } catch (error) {
    console.error(`[PDF-PROCESS] ❌ Placeholder creation failed:`, error.message)
    
    // Ultra-simple fallback: create a minimal valid JPEG
    console.log(`[PDF-PROCESS] Creating minimal fallback image...`)
    
    try {
      // Create smallest possible canvas
      const canvas = new Canvas(100, 100)
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, 100, 100)
      context.fillStyle = '#000000'
      context.fillRect(10, 10, 80, 80)
      
      return canvas.toBuffer('image/jpeg', { quality: 0.5 })
    } catch (fallbackError) {
      console.error(`[PDF-PROCESS] ❌ Even fallback placeholder failed:`, fallbackError.message)
      throw new Error(`Unable to create any placeholder image: ${fallbackError.message}`)
    }
  }
}

// Generate preview images at different sizes
const generatePreviewImages = async (pdfBuffer, fileId, magickAvailable = false) => {
  const previewUrls = {}
  
  try {
    console.log(`[PDF-PROCESS] ======= STARTING PREVIEW GENERATION =======`)
    console.log(`[PDF-PROCESS] FileID: ${fileId}, PDF Buffer: ${pdfBuffer.length} bytes, ImageMagick Available: ${magickAvailable}`)
    
    console.log(`[PDF-PROCESS] Converting first page to high-res image (scale: 3.0)`)
    // Convert first page to high-res image
    let highResImage
    try {
      highResImage = await convertPDFPageToImage(pdfBuffer, 1, 3.0, magickAvailable)
      console.log(`[PDF-PROCESS] ✅ High-res image generated successfully: ${highResImage.length} bytes`)
    } catch (conversionError) {
      console.error(`[PDF-PROCESS] ❌ PDF to image conversion failed:`, {
        message: conversionError.message,
        name: conversionError.name,
        stack: conversionError.stack?.substring(0, 500)
      })
      throw new Error(`PDF to image conversion failed: ${conversionError.message}`)
    }
    
    // Generate different sizes using Sharp
    console.log(`[PDF-PROCESS] Creating preview sizes:`, Object.keys(PREVIEW_SIZES))
    for (const [size, dimensions] of Object.entries(PREVIEW_SIZES)) {
      try {
        console.log(`[PDF-PROCESS] Creating ${size} preview (${dimensions.width}x${dimensions.height})`)
        
        const resizedImage = await sharp(highResImage)
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85 })
          .toBuffer()

        console.log(`[PDF-PROCESS] ✅ Resized image for ${size}: ${resizedImage.length} bytes`)

        // Upload to storage
        const storagePath = `previews/${fileId}/page-1-${size}.jpg`
        console.log(`[PDF-PROCESS] Uploading ${size} preview to: ${storagePath}`)
        
        try {
          await uploadFileToStorage(resizedImage, storagePath, 'image/jpeg')
          console.log(`[PDF-PROCESS] ✅ Successfully uploaded ${size} preview`)
          previewUrls[size] = storagePath
        } catch (uploadError) {
          console.error(`[PDF-PROCESS] ❌ Upload failed for ${size} preview:`, uploadError.message)
          throw new Error(`Upload failed for ${size} preview: ${uploadError.message}`)
        }
        
      } catch (sizeError) {
        console.error(`[PDF-PROCESS] ❌ Failed to create ${size} preview:`, {
          message: sizeError.message,
          dimensions: dimensions
        })
        throw new Error(`Failed to create ${size} preview: ${sizeError.message}`)
      }
    }

    console.log(`[PDF-PROCESS] ✅ All preview images generated successfully:`, Object.keys(previewUrls))
    return previewUrls
  } catch (error) {
    console.error(`[PDF-PROCESS] ❌ Preview generation failed:`, {
      message: error.message,
      name: error.name,
      fileId: fileId,
      bufferSize: pdfBuffer.length,
      magickAvailable: magickAvailable
    })
    throw new Error(`Preview generation failed: ${error.message}`)
  }
}

// Generate thumbnail images  
const generateThumbnails = async (pdfBuffer, fileId, pageCount, magickAvailable = false) => {
  const thumbnailUrls = {}
  
  try {
    const maxThumbnails = Math.min(pageCount, 5) // Max 5 thumbnail pages
    
    for (let pageNum = 1; pageNum <= maxThumbnails; pageNum++) {
      const pageImage = await convertPDFPageToImage(pdfBuffer, pageNum, 1.5, magickAvailable)
      
      // Create thumbnail (150x200 max)
      const thumbnail = await sharp(pageImage)
        .resize(150, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer()

      // Upload thumbnail to storage
      const storagePath = `thumbnails/${fileId}/page-${pageNum}.jpg`
      await uploadFileToStorage(thumbnail, storagePath, 'image/jpeg')
      
      if (!thumbnailUrls.pages) {
        thumbnailUrls.pages = []
      }
      thumbnailUrls.pages.push({
        page: pageNum,
        url: storagePath
      })
    }

    return thumbnailUrls
  } catch (error) {
    throw new Error(`Thumbnail generation failed: ${error.message}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { fileId } = req.body

  if (!fileId) {
    return res.status(400).json({ 
      error: 'Missing file ID',
      details: 'fileId is required for processing'
    })
  }

  try {
    console.log(`[PDF-PROCESS] ======= STARTING PDF PROCESSING =======`)
    console.log(`[PDF-PROCESS] File ID: ${fileId}`)
    console.log(`[PDF-PROCESS] Timestamp: ${new Date().toISOString()}`)
    
    // Check system ImageMagick availability first
    const magickStatus = await checkSystemImageMagickAvailability()
    
    // Force ImageMagick to be available if it's installed (our tests show it works)
    if (magickStatus.imagemagick === false) {
      try {
        // Test if ImageMagick command exists
        const testAvailability = await checkImageMagickAvailability()
        if (testAvailability) {
          console.log('[PDF-PROCESS] Overriding ImageMagick availability - command exists and works')
          magickStatus.imagemagick = true
        }
      } catch (error) {
        console.log('[PDF-PROCESS] ImageMagick override test failed:', error.message)
      }
    }
    
    // Log environment information for debugging
    console.log('[PDF-PROCESS] Environment check:', {
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
      imagemagick: magickStatus,
      globalsAvailable: {
        Canvas: typeof global.Canvas !== 'undefined',
        Image: typeof global.Image !== 'undefined',
        DOMMatrix: typeof global.DOMMatrix !== 'undefined',
        DOMPoint: typeof global.DOMPoint !== 'undefined',
        ImageData: typeof global.ImageData !== 'undefined',
        Path2D: typeof global.Path2D !== 'undefined'
      }
    })
    
    // Ensure temp directory exists
    ensureTempDir()

    // Get file upload record - this is the critical step that might fail
    console.log(`[PDF-PROCESS] Fetching file upload record for ID: ${fileId}`)
    const fileUpload = await getFileUploadById(fileId)
    console.log(`[PDF-PROCESS] File upload record result:`, fileUpload ? 'Found' : 'Not found')
    
    if (!fileUpload) {
      console.log(`[PDF-PROCESS] File not found: ${fileId} - returning 404`)
      return res.status(404).json({ 
        error: 'File not found',
        details: 'No file upload record found with the provided ID'
      })
    }

    // Check if already processing or completed
    if (fileUpload.processing_status === 'processing') {
      return res.status(409).json({ 
        error: 'Already processing',
        details: 'This file is currently being processed'
      })
    }

    if (fileUpload.processing_status === 'completed') {
      return res.status(200).json({ 
        message: 'File already processed',
        file: fileUpload
      })
    }

    console.log(`[PDF-PROCESS] Starting processing for file: ${fileId}`)
    
    // Update status to processing
    console.log(`[PDF-PROCESS] Updating status to processing`)
    await updateFileProcessingStatus(fileId, 'processing')

    // Download file from storage
    console.log(`[PDF-PROCESS] Downloading file from storage: ${fileUpload.storage_path}`)
    const pdfBuffer = await downloadFileFromStorage(fileUpload.storage_path)
    console.log(`[PDF-PROCESS] Downloaded ${pdfBuffer.length} bytes`)

    // Extract PDF metadata
    console.log(`[PDF-PROCESS] Extracting PDF metadata`)
    const metadata = await extractPDFMetadata(pdfBuffer)
    console.log(`[PDF-PROCESS] Metadata extracted:`, { pageCount: metadata.pageCount })

    // Get PDF dimensions
    console.log(`[PDF-PROCESS] Getting PDF dimensions`)
    const dimensions = await getPDFDimensions(pdfBuffer)
    console.log(`[PDF-PROCESS] Dimensions:`, dimensions)

    // Add PDF content analysis for debugging
    console.log(`[PDF-PROCESS] ======= PDF CONTENT ANALYSIS =======`)
    console.log(`[PDF-PROCESS] PDF buffer size: ${pdfBuffer.length} bytes`)
    console.log(`[PDF-PROCESS] PDF metadata:`, {
      pageCount: metadata.pageCount,
      title: metadata.title,
      author: metadata.author,
      hasTextContent: !!metadata.textContent,
      textLength: metadata.textContent?.length || 0
    })
    console.log(`[PDF-PROCESS] PDF dimensions:`, dimensions)
    
    if (metadata.textContent) {
      console.log(`[PDF-PROCESS] First 200 characters of text:`, metadata.textContent.substring(0, 200))
    }

    // Generate preview images at different sizes
    console.log(`[PDF-PROCESS] ======= GENERATING PREVIEW IMAGES =======`)
    const previewUrls = await generatePreviewImages(pdfBuffer, fileId, magickStatus.imagemagick)
    console.log(`[PDF-PROCESS] Preview images generated successfully:`, Object.keys(previewUrls))
    console.log(`[PDF-PROCESS] Preview URLs:`, previewUrls)

    // Generate thumbnail images
    console.log(`[PDF-PROCESS] ======= GENERATING THUMBNAIL IMAGES =======`)
    const thumbnailUrls = await generateThumbnails(pdfBuffer, fileId, metadata.pageCount, magickStatus.imagemagick)
    console.log(`[PDF-PROCESS] Thumbnail images generated successfully:`, thumbnailUrls.pages?.length || 0)
    console.log(`[PDF-PROCESS] Thumbnail URLs:`, thumbnailUrls)

    // Update file record with processing results
    const processingData = {
      page_count: metadata.pageCount,
      dimensions: dimensions,
      preview_urls: previewUrls,
      thumbnail_urls: thumbnailUrls,
      metadata: {
        ...metadata,
        processedAt: new Date().toISOString(),
        processingVersion: '1.0'
      }
    }

    const updatedFile = await updateFileWithProcessingResults(fileId, processingData)

    // Log successful processing
    console.log(`PDF processed successfully: ${fileId}`, {
      pageCount: metadata.pageCount,
      dimensions: dimensions,
      previewCount: Object.keys(previewUrls).length,
      thumbnailCount: thumbnailUrls.pages?.length || 0
    })

    res.status(200).json({
      success: true,
      message: 'PDF processed successfully',
      file: {
        id: updatedFile.id,
        fileName: updatedFile.file_name,
        fileSize: updatedFile.file_size,
        pageCount: updatedFile.page_count,
        dimensions: updatedFile.dimensions,
        previewUrls: updatedFile.preview_urls,
        thumbnailUrls: updatedFile.thumbnail_urls,
        processingStatus: updatedFile.processing_status,
        processedAt: updatedFile.updated_at,
        metadata: updatedFile.processing_metadata
      }
    })

  } catch (error) {
    console.error('[PDF-PROCESS] PDF processing error:', {
      message: error.message,
      stack: error.stack,
      fileId: fileId,
      name: error.name,
      code: error.code
    })

    // Update status to failed (only if we have a valid fileId)
    if (fileId) {
      try {
        await updateFileProcessingStatus(fileId, 'failed', {
          error: error.message,
          stack: error.stack,
          failedAt: new Date().toISOString()
        })
      } catch (updateError) {
        console.error('[PDF-PROCESS] Failed to update processing status:', updateError)
      }
    }

    // Handle specific error types with detailed logging
    if (error.message.includes('File not found') || error.message.includes('PGRST116')) {
      console.log('[PDF-PROCESS] File not found error - returning 404')
      return res.status(404).json({ 
        error: 'File not found',
        details: error.message
      })
    }

    if (error.message.includes('Storage download failed') || error.message.includes('Failed to download file')) {
      console.log('[PDF-PROCESS] Storage download error - returning 500')
      return res.status(500).json({ 
        error: 'Storage error',
        details: 'Unable to download file from storage'
      })
    }

    if (error.message.includes('PDF metadata extraction failed') || 
        error.message.includes('Invalid PDF') ||
        error.message.includes('provide binary data as')) {
      console.log('[PDF-PROCESS] PDF parsing error - returning 422')
      return res.status(422).json({ 
        error: 'Invalid PDF',
        details: 'Unable to extract PDF metadata. File may be corrupted or invalid.'
      })
    }

    // Handle system ImageMagick specific errors
    if (error.message.includes('ImageMagick not available') ||
        error.message.includes('convert') && error.message.includes('not found')) {
      console.log('[PDF-PROCESS] ImageMagick not available error - returning 503:', {
        errorMessage: error.message,
        details: 'System ImageMagick not installed or not accessible'
      })
      return res.status(503).json({ 
        error: 'Service unavailable',
        details: 'PDF processing service requires system ImageMagick which is not available'
      })
    }
    
    if (error.message.includes('ImageMagick conversion error') ||
        error.message.includes('Failed to read generated image') ||
        error.message.includes('Generated image is too small')) {
      console.log('[PDF-PROCESS] ImageMagick conversion error - returning 422:', {
        errorMessage: error.message,
        details: 'System ImageMagick PDF conversion failed'
      })
      return res.status(422).json({ 
        error: 'PDF conversion error',
        details: 'Unable to convert PDF using ImageMagick. The PDF may be corrupted or use unsupported features.'
      })
    }
    
    if (error.message.includes('Command failed') && error.message.includes('convert')) {
      console.log('[PDF-PROCESS] ImageMagick command error - returning 422:', {
        errorMessage: error.message,
        details: 'ImageMagick command execution failed'
      })
      return res.status(422).json({ 
        error: 'PDF conversion error',
        details: 'PDF conversion command failed. The PDF may contain unsupported elements.'
      })
    }

    // Handle PDF.js initialization and compatibility errors
    if (error.message.includes('PDF.js initialization failed')) {
      console.log('[PDF-PROCESS] PDF.js initialization error - returning 503:', {
        errorMessage: error.message,
        details: 'PDF.js module failed to load'
      })
      return res.status(503).json({ 
        error: 'Service unavailable',
        details: 'PDF processing service is temporarily unavailable'
      })
    }
    
    // Handle Canvas-specific rendering errors
    if (error.message.includes('Image or Canvas expected') ||
        error.message.includes('canvas.getContext is not a function') ||
        error.message.includes('Cannot read property') && error.message.includes('canvas')) {
      console.log('[PDF-PROCESS] Canvas compatibility error - returning 422:', {
        errorMessage: error.message,
        buildUsed: 'legacy',
        canvasFactoryUsed: 'NodeCanvasFactory',
        globalsAtError: {
          Canvas: typeof global.Canvas,
          Image: typeof global.Image,
          DOMMatrix: typeof global.DOMMatrix,
          DOMPoint: typeof global.DOMPoint,
          ImageData: typeof global.ImageData,
          Path2D: typeof global.Path2D
        }
      })
      return res.status(422).json({ 
        error: 'Canvas rendering error',
        details: 'Unable to render PDF page. Canvas compatibility issue detected.'
      })
    }

    // Handle browser API compatibility errors
    if (error.message.includes('PDF dimensions extraction failed') ||
        error.message.includes('PDF to image conversion failed') ||
        error.message.includes('DOMMatrix is not defined') ||
        error.message.includes('Path2D is not defined') ||
        error.message.includes('ImageData is not defined') ||
        error.message.includes('Missing required browser APIs') ||
        error.message.includes('Please provide binary data as `Uint8Array`') ||
        error.message.includes('Canvas is not supported')) {
      console.log('[PDF-PROCESS] PDF.js compatibility error - returning 422:', {
        errorMessage: error.message,
        errorStack: error.stack?.split('\n').slice(0, 5).join('\n'),
        missingAPI: error.message.match(/(DOMMatrix|Path2D|ImageData|DOMPoint|Canvas|Uint8Array).*not defined/)?.[1] || 'unknown',
        buildUsed: 'legacy',
        nodeVersion: process.version,
        platform: process.platform,
        globalsAtError: {
          Canvas: typeof global.Canvas,
          Image: typeof global.Image,
          DOMMatrix: typeof global.DOMMatrix,
          DOMPoint: typeof global.DOMPoint,
          ImageData: typeof global.ImageData,
          Path2D: typeof global.Path2D,
          createCanvas: typeof global.createCanvas
        },
        canvasPackageInfo: {
          canvasConstructor: typeof Canvas,
          canvasInstance: (() => {
            try {
              const testCanvas = new Canvas(10, 10)
              return { success: true, width: testCanvas.width }
            } catch (e) {
              return { success: false, error: e.message }
            }
          })()
        }
      })
      return res.status(422).json({ 
        error: 'PDF processing error',
        details: `Unable to process PDF file. ${error.message.includes('Uint8Array') ? 'Data format compatibility issue' : 'Browser API compatibility issue'} detected.`
      })
    }

    if (error.message.includes('Preview generation failed') || 
        error.message.includes('Thumbnail generation failed')) {
      console.log('[PDF-PROCESS] Image generation error - returning 500')
      return res.status(500).json({ 
        error: 'Image processing error',
        details: 'Unable to generate preview images'
      })
    }

    // Database connection errors
    if (error.message.includes('Failed to fetch file upload') ||
        error.message.includes('Missing Supabase environment variables')) {
      console.log('[PDF-PROCESS] Database connection error - returning 503')
      return res.status(503).json({ 
        error: 'Database unavailable',
        details: 'Unable to connect to database'
      })
    }

    // Generic error response with more detail for debugging
    console.log('[PDF-PROCESS] Unhandled error - returning generic 500')
    res.status(500).json({ 
      error: 'Processing failed',
      details: process.env.NODE_ENV === 'development' 
        ? `Error: ${error.message}`
        : 'An unexpected error occurred during PDF processing'
    })
  }
}