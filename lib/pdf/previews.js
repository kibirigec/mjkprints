import sharp from 'sharp';
import { renderPdfPageToImage } from './renderer.js';
import { uploadFileToStorage } from './storage.js';

const PREVIEW_SIZES = {
  small: { width: 200, height: 283 },
  medium: { width: 400, height: 566 },
  large: { width: 800, height: 1131 }
};

export const generatePreviewImages = async (pdfBuffer, fileId) => {
  const previewUrls = {};
  try {
    const highResImage = await renderPdfPageToImage(pdfBuffer, 1, 3.0);

    for (const [size, dimensions] of Object.entries(PREVIEW_SIZES)) {
      try {
        const resizedImage = await sharp(highResImage)
          .resize(dimensions.width, dimensions.height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        const storagePath = `previews/${fileId}/page-1-${size}.jpg`;
        await uploadFileToStorage(resizedImage, storagePath, 'image/jpeg');
        previewUrls[size] = storagePath;
      } catch (sizeError) {
        console.error(`[PREVIEWS] Failed to create ${size} preview:`, sizeError);
        // Continue even if one size fails
      }
    }
    return previewUrls;
  } catch (error) {
    console.error(`[PREVIEWS] Preview generation failed:`, error);
    throw new Error(`Preview generation failed: ${error.message}`);
  }
};

export const generateThumbnails = async (pdfBuffer, fileId, pageCount) => {
  const thumbnailUrls = { pages: [] };
  try {
    const maxThumbnails = Math.min(pageCount, 5);
    for (let pageNum = 1; pageNum <= maxThumbnails; pageNum++) {
      try {
        const pageImage = await renderPdfPageToImage(pdfBuffer, pageNum, 1.5);
        const thumbnail = await sharp(pageImage)
          .resize(150, 200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();

        const storagePath = `thumbnails/${fileId}/page-${pageNum}.jpg`;
        await uploadFileToStorage(thumbnail, storagePath, 'image/jpeg');
        thumbnailUrls.pages.push({ page: pageNum, url: storagePath });
      } catch (pageError) {
        console.error(`[THUMBNAILS] Failed to create thumbnail for page ${pageNum}:`, pageError);
        // Continue even if one page fails
      }
    }
    return thumbnailUrls;
  } catch (error) {
    console.error(`[THUMBNAILS] Thumbnail generation failed:`, error);
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  }
};
