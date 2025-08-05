# PDF Multi-Page Preview System

## Overview

The MJK Prints marketplace now includes a comprehensive PDF multi-page preview system that allows customers to view and navigate through PDF products before purchasing. This system provides a professional, interactive experience for showcasing digital products with multiple pages.

## Key Features

### 🔍 **Enhanced ProductCard for PDFs**
- **PDF Badge**: Red "PDF" indicator to distinguish from regular images
- **Page Count Display**: Shows total page count (e.g., "12 pages")
- **First Page Preview**: Displays the first page as the main product image
- **Smart Positioning**: Adjusts UI elements to avoid overlap with PDF indicators

### 📱 **PDF Multi-page Modal Viewer**
- **Interactive Navigation**: Previous/next buttons and page dots
- **Page Counter**: Shows current page position (e.g., "Page 3 of 12")
- **Zoom Functionality**: Click to zoom in/out on each page
- **Thumbnail Strip**: Hover to reveal thumbnail navigation
- **Keyboard Navigation**: Arrow keys and spacebar support
- **Preview Limitations**: Respects admin-configured preview page limits

### 🎨 **Professional Design Elements**
- **Loading States**: Elegant loading animations for page transitions
- **Error Handling**: Graceful degradation when previews aren't available
- **Copyright Protection**: Disabled right-click and drag for preview images
- **Responsive Design**: Optimized for both desktop and mobile viewing

## Technical Architecture

### Components

#### 1. **PDFViewer Component** (`/components/PDFViewer.js`)
Main component for displaying PDF previews with full navigation capabilities.

**Props:**
- `product`: Product object with PDF metadata
- `isZoomed`: Boolean for zoom state
- `onToggleZoom`: Function to handle zoom toggle
- `className`: Additional CSS classes

**Features:**
- Multi-page carousel with smooth transitions
- Keyboard navigation (arrow keys, spacebar)
- Thumbnail strip on hover
- Loading and error states
- Copyright protection measures

#### 2. **Enhanced ProductCard** (`/components/ProductCard.js`)
Updated to detect and display PDF products with appropriate indicators.

**New Features:**
- PDF badge and page count display
- Smart positioning of UI elements
- PDF-specific product tags
- Fallback to first preview image

#### 3. **Enhanced ProductModal** (`/components/ProductModal.js`)
Modal viewer that conditionally renders PDF viewer or traditional image viewer.

**Updates:**
- Conditional rendering based on product type
- PDF-specific product details
- Preview limitation notices
- Enhanced "What's Included" section

### Utility Functions

#### **Product Utilities** (`/utils/productUtils.js`)
Comprehensive utility functions for handling different product types:

- `isPDFProduct(product)`: Detect PDF products
- `getProductDisplayImage(product)`: Get appropriate display image
- `formatPageCount(pageCount)`: Format page count for display
- `getProductTags(product)`: Generate product-specific tags
- `hasPreviewPages(product)`: Check preview availability
- And many more...

### API Endpoints

#### 1. **Preview API** (`/api/products/[id]/preview`)
Returns preview metadata and URLs for a PDF product.

**Response:**
```json
{
  "product_id": "uuid",
  "title": "Product Title",
  "total_pages": 12,
  "preview_pages": 3,
  "preview_urls": ["url1", "url2", "url3"],
  "thumbnail_urls": {"small": "...", "medium": "...", "large": "..."},
  "processing_status": "completed",
  "message": "Showing preview of 3 pages out of 12 total pages"
}
```

#### 2. **Page Preview API** (`/api/products/[id]/preview/[page]`)
Returns specific page preview data with validation.

**Features:**
- Page-level access validation
- Preview limit enforcement
- Direct image serving option (`?direct=true`)
- Security headers for image protection

## Database Schema

### Products Table Enhancements
```sql
ALTER TABLE products ADD COLUMNS:
- pdf_file_id UUID (references file_uploads)
- page_count INTEGER
- file_dimensions JSONB
- print_specifications JSONB  
- preview_pages INTEGER DEFAULT 3
```

### File Uploads Table
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  page_count INTEGER,
  preview_urls JSONB, -- Array of preview image URLs
  thumbnail_urls JSONB, -- {small, medium, large}
  processing_status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  -- ... other fields
);
```

## Configuration Options

### Preview Limits
- **Default Preview Pages**: 3 pages per product
- **Maximum Preview**: Configurable per product via `preview_pages` field
- **Admin Override**: Can be adjusted in product settings

### Security Features
- **Right-click Protection**: Disabled on preview images
- **Drag Prevention**: Images cannot be dragged/saved easily
- **Watermark Support**: Ready for watermark overlay implementation
- **Rate Limiting**: API endpoints include rate limiting configuration

## Usage Examples

### Basic PDF Product Display
```jsx
import { PDFViewer } from './components/PDFViewer'
import { isPDFProduct } from './utils/productUtils'

function ProductDisplay({ product }) {
  if (isPDFProduct(product)) {
    return <PDFViewer product={product} />
  }
  return <ImageViewer product={product} />
}
```

### Product Type Detection
```jsx
import { isPDFProduct, getProductDisplayImage, formatPageCount } from './utils/productUtils'

function ProductInfo({ product }) {
  const isPDF = isPDFProduct(product)
  const displayImage = getProductDisplayImage(product)
  
  return (
    <div>
      <img src={displayImage} alt={product.title} />
      {isPDF && (
        <span className="pdf-badge">
          PDF - {formatPageCount(product.page_count)}
        </span>
      )}
    </div>
  )
}
```

## Sample Data

The system includes comprehensive sample data (`sample-pdf-data.sql`) with:

- **4 Complete PDF Products**: Various page counts and preview configurations
- **1 Processing Example**: Shows handling of files still being processed
- **Mixed Content**: Both PDF and traditional image products
- **Realistic Metadata**: File sizes, dimensions, print specifications

### Sample Products Include:
1. **Digital Art Portfolio** (12 pages, 3 preview)
2. **Wedding Invitation Suite** (8 pages, 3 preview)  
3. **Business Card Templates** (6 pages, 3 preview)
4. **Logo Design Collection** (24 pages, 5 preview)
5. **Corporate Brochures** (16 pages, processing state)

## Testing Scenarios

### 1. **PDF Product Display**
- Verify PDF badge appears on ProductCard
- Check page count display
- Confirm first preview image is used as main image

### 2. **Modal Navigation**
- Test previous/next buttons
- Verify page dots navigation
- Check keyboard navigation (arrows, spacebar)
- Test zoom functionality

### 3. **Preview Limitations**
- Confirm only preview pages are accessible
- Verify "preview limit" notices appear
- Test behavior when preview pages < total pages

### 4. **Error Handling**
- Test with missing preview images
- Verify processing state handling
- Check fallback behaviors

### 5. **Performance**
- Test lazy loading of page images
- Verify smooth transitions
- Check mobile responsiveness

## Browser Compatibility

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Support**: iOS Safari 14+, Android Chrome 90+
- **Fallbacks**: Graceful degradation for unsupported features

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators and logical tab order
- **Alternative Text**: Descriptive alt text for all images
- **High Contrast**: Compatible with high contrast mode

## Performance Optimizations

- **Lazy Loading**: Preview images load only when needed
- **Image Caching**: Browser caching headers for preview images
- **Optimized Thumbnails**: Multiple thumbnail sizes for different use cases
- **Efficient API**: Minimal data transfer with targeted endpoints

## Security Considerations

- **Preview Access Control**: Server-side validation of preview limits
- **Copyright Protection**: Disabled right-click and drag operations
- **Rate Limiting**: API endpoints include rate limiting
- **Image Security**: Security headers prevent hotlinking and abuse

## Future Enhancements

### Planned Features
- **Watermark Overlay**: Dynamic watermarking of preview images
- **Full-Screen Mode**: Dedicated full-screen PDF viewer
- **Search Within PDF**: Text search across preview pages
- **Download Preview**: Limited PDF with only preview pages
- **Analytics**: Track which pages are viewed most

### Technical Improvements
- **PDF.js Integration**: Client-side PDF rendering for better control
- **Progressive Loading**: Stream large PDFs for faster initial load
- **Offline Support**: Cache frequently viewed previews
- **CDN Integration**: Serve preview images from global CDN

## Troubleshooting

### Common Issues

**PDFs not showing preview:**
- Check `processing_status` is 'completed'
- Verify `preview_urls` array has content
- Confirm API endpoints are accessible

**Navigation not working:**
- Ensure JavaScript is enabled
- Check for console errors
- Verify event handlers are properly attached

**Images not loading:**
- Check network connectivity
- Verify image URLs are accessible
- Review CORS headers if serving from different domain

### Debug Information

Enable debug mode by setting `NODE_ENV=development` to see:
- Detailed error messages in API responses
- Console logging for component state changes
- Network request/response details

## Support

For technical support or questions about the PDF preview system:

1. **Check Console**: Look for JavaScript errors or warnings
2. **Verify Data**: Ensure products have proper PDF metadata
3. **Test API**: Use browser dev tools to test API endpoints directly
4. **Review Logs**: Check server logs for processing errors

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Compatible**: MJK Prints v2.0+