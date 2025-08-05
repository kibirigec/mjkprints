import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const execFileAsync = promisify(execFile);

/**
 * Check if ImageMagick is available on the system
 */
export async function checkImageMagickAvailability() {
  try {
    const { stdout, stderr } = await execFileAsync('convert', ['-version'], { timeout: 5000 });
    const version = stdout.split('\n')[0];
    console.log('[IMAGEMAGICK] ✅ ImageMagick available:', version);
    return true;
  } catch (error) {
    console.log('[IMAGEMAGICK] ❌ ImageMagick not available:', error.message);
    return false;
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
    
    // Build ImageMagick command
    // convert "input.pdf[page-1]" -density 150 -quality 90 -background white -alpha remove "output.jpg"
    const args = [
      `${tempPdfPath}[${pageNumber - 1}]`, // PDF file with page selection
      '-density', density.toString(),
      '-quality', quality.toString(),
      '-background', 'white',
      '-alpha', 'remove', // Remove transparency and fill with white
      '-colorspace', 'RGB', // Ensure RGB colorspace
      tempImagePath
    ];
    
    console.log(`[IMAGEMAGICK] Command: convert ${args.join(' ')}`);
    console.log(`[IMAGEMAGICK] Starting conversion with ${timeout}ms timeout...`);
    
    // Execute ImageMagick with timeout protection
    const { stdout, stderr } = await execFileAsync('convert', args, { 
      timeout: timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer limit
    });
    
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
    const { stdout } = await execFileAsync('convert', ['-version'], { timeout: 5000 });
    const lines = stdout.split('\n');
    const version = lines[0];
    const features = lines.find(line => line.includes('Features:')) || '';
    const delegates = lines.find(line => line.includes('Delegates:')) || '';
    
    return {
      available: true,
      version: version,
      features: features,
      delegates: delegates,
      supportsPDF: delegates.includes('pdf') || delegates.includes('gs'),
      supportsJPEG: delegates.includes('jpeg') || delegates.includes('jpg')
    };
  } catch (error) {
    return {
      available: false,
      error: error.message
    };
  }
}