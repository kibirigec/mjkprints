import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

// Cache for ImageMagick availability to avoid repeated checks
let imagemagickCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if ImageMagick is available on the system
 */
export async function checkImageMagickAvailability() {
  try {
    // Try the modern 'magick' command first (ImageMagick 7+)
    const { stdout, stderr } = await execFileAsync('magick', ['-version'], { timeout: 5000 });
    const version = stdout.split('\n')[0];
    console.log('[IMAGEMAGICK] ✅ ImageMagick available (modern):', version);
    return true;
  } catch (error) {
    try {
      // Fallback to legacy 'convert' command (ImageMagick 6)
      const { stdout, stderr } = await execFileAsync('convert', ['-version'], { timeout: 5000 });
      const version = stdout.split('\n')[0];
      console.log('[IMAGEMAGICK] ✅ ImageMagick available (legacy):', version);
      return true;
    } catch (legacyError) {
      console.log('[IMAGEMAGICK] ❌ ImageMagick not available:', error.message);
      return false;
    }
  }
}

/**
 * Convert PDF buffer to image using system ImageMagick
 * This is more reliable than WASM in Node.js environments
 */
export async function convertPDFToImageWithSystemMagick(pdfBuffer, pageNumber = 1, density = 150, quality = 90, timeout = 30000) {
  console.log(`[IMAGEMAGICK] Converting PDF page ${pageNumber} (density: ${density}, quality: ${quality})`);
  
  const tempDir = '/tmp/imagemagick-convert';
  
  try {
    // Ensure temp directory exists
    mkdirSync(tempDir, { recursive: true });
    
    // Create unique temporary file names
    const randomId = randomBytes(8).toString('hex');
    const tempPdfPath = join(tempDir, `input-${randomId}.pdf`);
    const tempImagePath = join(tempDir, `output-${randomId}.jpg`);
    
    // Write PDF buffer to temporary file
    writeFileSync(tempPdfPath, pdfBuffer);
    console.log(`[IMAGEMAGICK] Temporary PDF written: ${tempPdfPath} (${pdfBuffer.length} bytes)`);
    
    // Build ImageMagick command - use modern 'magick' command for ImageMagick 7+
    // magick "input.pdf[page-1]" -density 150 -quality 90 -background white -alpha remove "output.jpg"
    const args = [
      `${tempPdfPath}[${pageNumber - 1}]`, // PDF file with page selection
      '-density', density.toString(),
      '-quality', quality.toString(),
      '-background', 'white',
      '-alpha', 'remove', // Remove transparency and fill with white
      '-colorspace', 'RGB', // Ensure RGB colorspace
      tempImagePath
    ];
    
    console.log(`[IMAGEMAGICK] Command: magick ${args.join(' ')}`);
    console.log(`[IMAGEMAGICK] Starting conversion with ${timeout}ms timeout...`);
    
    // Execute ImageMagick with timeout protection - try modern command first
    let stdout, stderr;
    try {
      const result = await execFileAsync('magick', args, { 
        timeout: timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer limit
      });
      stdout = result.stdout;
      stderr = result.stderr;
      console.log(`[IMAGEMAGICK] Using modern 'magick' command`);
    } catch (modernError) {
      console.log(`[IMAGEMAGICK] Modern 'magick' command failed, trying legacy 'convert':`, modernError.message);
      // Fallback to legacy convert command
      const result = await execFileAsync('convert', args, { 
        timeout: timeout,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer limit
      });
      stdout = result.stdout;
      stderr = result.stderr;
      console.log(`[IMAGEMAGICK] Using legacy 'convert' command`);
    }
    
    if (stderr && stderr.includes('Error')) {
      console.error(`[IMAGEMAGICK] Conversion stderr:`, stderr);
      throw new Error(`ImageMagick conversion error: ${stderr}`);
    }
    
    console.log(`[IMAGEMAGICK] Conversion completed`);
    if (stdout) {
      console.log(`[IMAGEMAGICK] Stdout:`, stdout);
    }
    
    // Read the generated image
    let imageBuffer;
    try {
      imageBuffer = readFileSync(tempImagePath);
      console.log(`[IMAGEMAGICK] Image read successfully: ${imageBuffer.length} bytes`);
    } catch (readError) {
      throw new Error(`Failed to read generated image: ${readError.message}`);
    }
    
    // Clean up temporary files
    try {
      unlinkSync(tempPdfPath);
      unlinkSync(tempImagePath);
      console.log(`[IMAGEMAGICK] Cleaned up temporary files`);
    } catch (cleanupError) {
      console.warn(`[IMAGEMAGICK] Cleanup warning:`, cleanupError.message);
    }
    
    // Validate the result
    if (imageBuffer.length < 1000) {
      throw new Error(`Generated image is too small: ${imageBuffer.length} bytes`);
    }
    
    // Verify JPEG header
    if (imageBuffer[0] !== 0xFF || imageBuffer[1] !== 0xD8) {
      throw new Error('Generated file is not a valid JPEG image');
    }
    
    console.log(`[IMAGEMAGICK] ✅ Conversion successful: ${imageBuffer.length} bytes`);
    return imageBuffer;
    
  } catch (error) {
    console.error(`[IMAGEMAGICK] Conversion failed:`, {
      message: error.message,
      pageNumber,
      density,
      quality,
      bufferSize: pdfBuffer.length
    });
    
    // Clean up on error
    try {
      const randomId = randomBytes(8).toString('hex');
      const tempPdfPath = join(tempDir, `input-${randomId}.pdf`);
      const tempImagePath = join(tempDir, `output-${randomId}.jpg`);
      unlinkSync(tempPdfPath);
      unlinkSync(tempImagePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    throw error;
  }
}

/**
 * Convert PDF page with scale parameter (compatible with existing interface)
 */
export async function convertPDFPageWithSystemImageMagick(pdfBuffer, pageNumber = 1, scale = 2.0) {
  console.log(`[IMAGEMAGICK] Converting page ${pageNumber} using system ImageMagick (scale: ${scale})`);
  
  try {
    // Convert scale to density (scale * 150 DPI base)
    const density = Math.floor(scale * 150);
    console.log(`[IMAGEMAGICK] Calculated density: ${density} DPI from scale: ${scale}`);
    
    // Convert PDF to image
    const imageBuffer = await convertPDFToImageWithSystemMagick(pdfBuffer, pageNumber, density, 90, 30000);
    
    console.log(`[IMAGEMAGICK] ✅ System ImageMagick conversion completed: ${imageBuffer.length} bytes`);
    return imageBuffer;
    
  } catch (error) {
    console.error(`[IMAGEMAGICK] convertPDFPageWithSystemImageMagick failed:`, {
      message: error.message,
      pageNumber,
      scale,
      bufferSize: pdfBuffer.length
    });
    throw error;
  }
}

/**
 * Get ImageMagick version and capabilities info
 */
export async function getImageMagickInfo() {
  try {
    // Try modern magick command first
    let stdout;
    try {
      const result = await execFileAsync('magick', ['-version'], { timeout: 5000 });
      stdout = result.stdout;
    } catch (modernError) {
      // Fallback to legacy convert command
      const result = await execFileAsync('convert', ['-version'], { timeout: 5000 });
      stdout = result.stdout;
    }
    
    const lines = stdout.split('\n');
    const version = lines[0];
    const features = lines.find(line => line.includes('Features:')) || '';
    const delegates = lines.find(line => line.includes('Delegates')) || '';
    
    // Check for PDF support via Ghostscript - note that ImageMagick 7+ uses Ghostscript internally
    // even if 'gs' or 'pdf' isn't listed in delegates, as long as Ghostscript is installed
    let supportsPDF = delegates.includes('pdf') || delegates.includes('gs') || delegates.includes('gslib');
    const supportsJPEG = delegates.includes('jpeg') || delegates.includes('jpg');
    
    // If PDF support not detected in delegates, test it directly (ImageMagick 7+ with system Ghostscript)
    if (!supportsPDF) {
      try {
        console.log('[IMAGEMAGICK] PDF not in delegates, testing actual PDF conversion...');
        // Try to convert a minimal PDF to see if it works
        const testResult = await execFileAsync('magick', [
          '-size', '100x100', 
          'xc:white', 
          'pdf:-'
        ], { timeout: 5000 });
        
        if (testResult.stdout.length > 0) {
          supportsPDF = true;
          console.log('[IMAGEMAGICK] ✅ PDF conversion test successful - PDF support confirmed');
        }
      } catch (testError) {
        console.log('[IMAGEMAGICK] PDF conversion test failed:', testError.message);
      }
    }
    
    console.log('[IMAGEMAGICK] Version info:', {
      version: version.substring(0, 50),
      supportsPDF,
      supportsJPEG,
      delegates: delegates.substring(0, 150)
    });
    
    return {
      available: true,
      version: version,
      features: features,
      delegates: delegates,
      supportsPDF: supportsPDF,
      supportsJPEG: supportsJPEG
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}