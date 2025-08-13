// Diagnostic endpoint to test PDF processing environment
import { Canvas, Image, DOMMatrix, DOMPoint, ImageData } from 'canvas'

// Simple Path2D polyfill
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
}

// Set globals
if (typeof global !== 'undefined') {
  global.Canvas = Canvas
  global.Image = Image
  global.DOMMatrix = DOMMatrix
  global.DOMPoint = DOMPoint
  global.ImageData = ImageData
  global.Path2D = Path2D
  global.createCanvas = (width, height) => new Canvas(width, height)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        env: process.env.NODE_ENV
      },
      packages: {
        canvas: {
          available: !!Canvas,
          constructor: typeof Canvas,
          version: process.env.npm_package_dependencies_canvas || 'unknown'
        },
        pdfjs: {
          version: process.env.npm_package_dependencies_pdfjs_dist || 'unknown'
        }
      },
      globals: {
        Canvas: typeof global.Canvas,
        Image: typeof global.Image,
        DOMMatrix: typeof global.DOMMatrix,
        DOMPoint: typeof global.DOMPoint,
        ImageData: typeof global.ImageData,
        Path2D: typeof global.Path2D,
        createCanvas: typeof global.createCanvas
      },
      tests: {}
    }

    // Test canvas creation
    try {
      const testCanvas = new Canvas(10, 10)
      const context = testCanvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, 10, 10)
      diagnostics.tests.canvasCreation = { success: true }
    } catch (error) {
      diagnostics.tests.canvasCreation = { success: false, error: error.message }
    }

    // Test DOMMatrix
    try {
      const matrix = new DOMMatrix()
      diagnostics.tests.domMatrix = { success: true }
    } catch (error) {
      diagnostics.tests.domMatrix = { success: false, error: error.message }
    }

    // Test PDF.js import
    try {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      // Configure worker for serverless environments
      // Use CDN worker URL as fallback for serverless environments where local worker files aren't available
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      diagnostics.tests.pdfjsImport = { success: true, version: pdfjs.version, workerCDN: true }
    } catch (error) {
      diagnostics.tests.pdfjsImport = { success: false, error: error.message }
    }

    // Test simple PDF processing
    try {
      // Create minimal PDF for testing
      const minimalPdf = Buffer.from([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, // %PDF-1.4
        0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 1 0 obj
        0x3C, 0x3C, 0x0A, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x20, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x0A, // <</Type /Catalog
        0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x0A, // /Pages 2 0 R
        0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, // >>endobj
        0x25, 0x25, 0x45, 0x4F, 0x46 // %%EOF
      ])

      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      // Configure worker for serverless environments
      // Use CDN worker URL as fallback for serverless environments where local worker files aren't available
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
      
      const uint8Array = new Uint8Array(minimalPdf)
      const pdf = await pdfjs.getDocument({ 
        data: uint8Array,
        isEvalSupported: false,
        disableWorker: true
      }).promise
      diagnostics.tests.pdfProcessing = { success: true, pages: pdf.numPages }
    } catch (error) {
      diagnostics.tests.pdfProcessing = { success: false, error: error.message }
    }

    return res.status(200).json(diagnostics)

  } catch (error) {
    return res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    })
  }
}