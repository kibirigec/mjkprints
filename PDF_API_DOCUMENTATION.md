# PDF Upload API Documentation

This document describes the PDF upload, processing, and serving API endpoints for the MJK Prints digital marketplace.

## Overview

The PDF system consists of three main API endpoints that work together to handle digital product files:

1. **Upload API** (`/api/upload/pdf`) - Secure PDF file uploads with validation
2. **Processing API** (`/api/process/pdf`) - PDF processing and metadata extraction  
3. **File Serving API** (`/api/files/[...path]`) - Secure file serving with access control

## API Endpoints

### 1. PDF Upload Endpoint

**POST** `/api/upload/pdf`

Handles secure PDF file uploads with comprehensive validation and security checks.

#### Request Format
- **Content-Type**: `multipart/form-data`
- **Field Name**: `pdf` or `file`
- **Max File Size**: 50MB
- **Allowed Types**: PDF files only

#### Security Features
- File type validation (beyond MIME types)
- PDF structure validation
- File size limits
- Rate limiting (5 uploads per minute per IP)
- Malicious file detection
- Checksum generation for integrity

#### Response Format
```json
{
  "success": true,
  "message": "PDF uploaded successfully",
  "file": {
    "id": "12345",
    "fileName": "artwork.pdf",
    "fileSize": 2048576,
    "pageCount": 8,
    "checksum": "sha256_hash",
    "processingStatus": "pending",
    "uploadedAt": "2024-01-01T12:00:00Z",
    "metadata": {
      "title": "Artwork Title",
      "author": "Artist Name",
      "creator": "Adobe Illustrator",
      "creationDate": "2024-01-01T10:00:00Z"
    }
  }
}
```

#### Error Responses
- `400` - Invalid file type, size, or structure
- `429` - Rate limit exceeded
- `500` - Upload or storage failure

---

### 2. PDF Processing Endpoint

**POST** `/api/process/pdf`

Processes uploaded PDF files to generate previews, thumbnails, and extract metadata.

#### Request Format
```json
{
  "fileId": "12345"
}
```

#### Processing Features
- Page preview generation (small, medium, large sizes)
- Thumbnail creation (up to 5 pages)
- Detailed metadata extraction
- Dimension analysis
- Error handling and status updates

#### Response Format
```json
{
  "success": true,
  "message": "PDF processed successfully",
  "file": {
    "id": "12345",
    "fileName": "artwork.pdf",
    "fileSize": 2048576,
    "pageCount": 8,
    "dimensions": {
      "width": 595.276,
      "height": 841.89,
      "aspectRatio": 0.707
    },
    "previewUrls": {
      "small": "previews/12345/page-1-small.jpg",
      "medium": "previews/12345/page-1-medium.jpg", 
      "large": "previews/12345/page-1-large.jpg"
    },
    "thumbnailUrls": {
      "pages": [
        {"page": 1, "url": "thumbnails/12345/page-1.jpg"},
        {"page": 2, "url": "thumbnails/12345/page-2.jpg"}
      ]
    },
    "processingStatus": "completed",
    "processedAt": "2024-01-01T12:05:00Z"
  }
}
```

#### Error Responses
- `400` - Missing file ID
- `404` - File not found
- `409` - Already processing
- `422` - Invalid PDF structure
- `500` - Processing failure

---

### 3. File Serving Endpoint

**GET** `/api/files/[...path]`

Serves PDF files, previews, and thumbnails with secure access control.

#### URL Patterns
- **Original PDF**: `/api/files/pdfs/[filename]?token=[jwt_token]`
- **Preview Images**: `/api/files/previews/[fileId]/page-1-[size].jpg?preview=true`
- **Thumbnails**: `/api/files/thumbnails/[fileId]/page-[num].jpg?thumbnail=true`

#### Security Features
- JWT token verification for original files
- Rate limiting (100 downloads per day per IP)
- Access permission validation
- Download tracking and analytics
- Signed URL generation

#### Query Parameters
- `token` - JWT token for secure access (required for original files)
- `preview=true` - Marks request as preview access
- `thumbnail=true` - Marks request as thumbnail access
- `redirect=false` - Return JSON with signed URL instead of redirecting

#### Response Formats

**Direct Access** (default):
- Redirects to signed URL for immediate download

**API Response** (with `redirect=false`):
```json
{
  "success": true,
  "downloadUrl": "https://storage.url/signed-url",
  "expiresAt": "2024-01-01T13:00:00Z",
  "fileInfo": {
    "id": "12345",
    "type": "preview"
  }
}
```

#### Error Responses
- `401` - Invalid or expired token
- `403` - Access denied
- `404` - File not found
- `429` - Rate limit exceeded
- `500` - File serving error

---

## Integration with Products API

The PDF system integrates with the existing products API:

### Creating Products with PDF Files

**POST** `/api/products`

```json
{
  "title": "Digital Artwork",
  "description": "High-quality digital art print",
  "price": 29.99,
  "image": "/api/files/previews/12345/page-1-medium.jpg?preview=true",
  "pdfFileId": "12345"
}
```

### Updating Products with PDF Data

**PUT** `/api/products`

```json
{
  "id": "product_123",
  "title": "Updated Digital Artwork",
  "description": "Updated description",
  "price": 34.99,
  "image": "/api/files/previews/12345/page-1-medium.jpg?preview=true",
  "pdfFileId": "12345",
  "pdfData": {
    "page_count": 8,
    "file_dimensions": {"width": 595, "height": 842},
    "print_specifications": {"dpi": 300, "color_mode": "CMYK"}
  }
}
```

---

## Workflow Example

### Complete Upload → Process → Serve Workflow

```javascript
// 1. Upload PDF file
const formData = new FormData()
formData.append('pdf', pdfFile)

const uploadResponse = await fetch('/api/upload/pdf', {
  method: 'POST',
  body: formData
})
const uploadResult = await uploadResponse.json()

// 2. Process PDF
const processResponse = await fetch('/api/process/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileId: uploadResult.file.id })
})
const processResult = await processResponse.json()

// 3. Create product
const productResponse = await fetch('/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'My Digital Art',
    description: 'Beautiful digital artwork',
    price: 29.99,
    image: `/api/files/previews/${processResult.file.id}/page-1-medium.jpg?preview=true`,
    pdfFileId: processResult.file.id
  })
})
const product = await productResponse.json()

// 4. Access files
const previewUrl = `/api/files/previews/${processResult.file.id}/page-1-medium.jpg?preview=true`
const thumbnailUrl = `/api/files/thumbnails/${processResult.file.id}/page-1.jpg?thumbnail=true`
```

---

## Database Schema

The PDF system uses the following database tables:

### `file_uploads`
- `id` - Primary key
- `product_id` - Foreign key to products (nullable)
- `file_name` - Original filename
- `file_size` - File size in bytes
- `file_type` - File type ('pdf')
- `content_type` - MIME type
- `storage_path` - Path in Supabase Storage
- `checksum` - SHA256 checksum
- `processing_status` - Status: pending, processing, completed, failed
- `page_count` - Number of pages
- `dimensions` - Page dimensions (JSON)
- `preview_urls` - Preview image paths (JSON)
- `thumbnail_urls` - Thumbnail image paths (JSON)
- `processing_metadata` - Additional metadata (JSON)

### `products` (updated)
- `pdf_file_id` - Foreign key to file_uploads
- `page_count` - Number of pages (denormalized)
- `file_dimensions` - File dimensions (JSON)
- `print_specifications` - Print specs (JSON)
- `preview_pages` - Preview page numbers (JSON)

---

## Environment Variables

Required environment variables:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret for file access tokens
JWT_SECRET=your_jwt_secret_key

# Site URL for download links
NEXT_PUBLIC_SITE_URL=https://yoursite.com
```

---

## Testing

Use the provided test script to verify the complete workflow:

```bash
# Install test dependencies
npm install form-data node-fetch

# Run workflow test
node test-pdf-workflow.js path/to/test.pdf
```

The test script will:
1. Upload a PDF file
2. Process the PDF
3. Create a product
4. Test file serving endpoints
5. Verify product retrieval

---

## Security Considerations

- **File Validation**: Multiple layers of PDF validation
- **Rate Limiting**: Upload and download rate limits
- **Access Control**: Token-based access for original files
- **Integrity Checking**: SHA256 checksums for file integrity
- **Size Limits**: 50MB maximum file size
- **Malware Scanning**: Basic PDF structure validation
- **Storage Security**: Secure Supabase Storage with proper permissions

---

## Performance Considerations

- **Async Processing**: PDF processing happens asynchronously
- **Image Optimization**: Sharp library for efficient image processing
- **Caching**: Signed URLs with appropriate cache headers
- **Storage**: Efficient Supabase Storage with CDN
- **Rate Limiting**: Prevents abuse and ensures fair usage

---

## Error Handling

All endpoints provide consistent error responses:

```json
{
  "error": "Error category",
  "details": "Specific error message"
}
```

Common error categories:
- `Invalid file type` - File validation errors
- `File too large` - Size limit exceeded
- `Access denied` - Permission errors
- `Processing failed` - PDF processing errors
- `Rate limit exceeded` - Too many requests