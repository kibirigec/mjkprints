# ProductModal Component

A comprehensive modal component for adding and editing products in the MJK Prints dashboard with full PDF upload support and responsive design.

## Features

### 🎨 **Professional Design**
- Full-screen modal (95vw x 95vh) with backdrop blur
- Smooth animations and transitions
- MJK Prints brand colors and styling
- Mobile-responsive design

### 📝 **Form Management**
- **Add Mode**: Create new products with blank form
- **Edit Mode**: Pre-populate form with existing product data
- Client-side validation with real-time error feedback
- Auto-focus on title field when modal opens

### 📄 **PDF Integration**
- Integration with existing `PDFUploadZone` component
- Real-time PDF processing with `PDFPreviewComponent`
- Auto-populate title from PDF metadata
- Auto-generate image URL from processed PDF preview
- Support for both PDF upload and manual image URL modes

### ✅ **Validation & Error Handling**
- Required field validation (title, description, price)
- PDF upload error handling
- Processing status feedback
- Form submission error management
- Real-time validation with error clearing

### 🔄 **State Management**
- Comprehensive form state handling
- PDF upload progress tracking
- Processing status management
- Success/error message display

## Props

```javascript
{
  isOpen: boolean,           // Controls modal visibility
  onClose: function,         // Called when modal closes
  mode: 'add' | 'edit',     // Determines form behavior
  editProduct: object | null, // Product data for edit mode
  onSave: function,         // Called when product is saved
  onSuccess: function       // Called on successful completion
}
```

## Usage

### Basic Integration

```javascript
import { useState } from 'react';
import ProductModal from './components/ProductModal';

function MyDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingProduct, setEditingProduct] = useState(null);

  const handleAddProduct = () => {
    setModalMode('add');
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleModalSave = (savedProduct) => {
    // Refresh your products list
    fetchProducts();
  };

  return (
    <div>
      <button onClick={handleAddProduct}>Add Product</button>
      
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        editProduct={editingProduct}
        onSave={handleModalSave}
        onSuccess={() => console.log('Success!')}
      />
    </div>
  );
}
```

### Advanced Usage with State Management

```javascript
const [products, setProducts] = useState([]);

const handleModalSave = (savedProduct) => {
  if (modalMode === 'add') {
    setProducts(prev => [...prev, savedProduct]);
  } else {
    setProducts(prev => 
      prev.map(p => p.id === savedProduct.id ? savedProduct : p)
    );
  }
};
```

## Form Fields

### **Basic Information**
- **Title**: Required text input with auto-focus
- **Description**: Required textarea (4 rows, non-resizable)
- **Price**: Required number input with $ symbol, validates > 0

### **Product Image Section**
Toggle between two modes:

#### **PDF Upload Mode** (Default)
- Drag & drop PDF upload via `PDFUploadZone`
- Real-time processing with `PDFPreviewComponent`
- Auto-populates image URL from processed PDF
- Shows processing progress and status
- "Upload Different PDF" option

#### **Image URL Mode**
- Manual image URL input with validation
- Live image preview
- URL format validation

## States & Feedback

### **Loading States**
- Form submission loading with spinner
- PDF upload progress tracking
- PDF processing status indication
- Disabled states during operations

### **Success States**
- Success overlay with animation
- Auto-close after 1.5 seconds
- Callback notifications

### **Error States**
- Field-specific error messages
- PDF upload/processing errors
- Form submission errors
- Visual error indicators (red borders)

## Validation Rules

### **Required Fields**
- Title: Must not be empty
- Description: Must not be empty  
- Price: Must be valid number > 0

### **Conditional Requirements**
- **PDF Mode**: Must have processed PDF data OR switch to Image URL mode
- **Image URL Mode**: Must have valid image URL OR switch to PDF mode

### **Real-time Validation**
- Errors clear as user corrects fields
- Immediate feedback on field blur/change
- Submit button disabled during processing

## Accessibility Features

### **Keyboard Support**
- ESC key closes modal
- Tab navigation through form fields
- Auto-focus on title field

### **Screen Reader Support**
- Proper form labels and ARIA attributes
- Error message associations
- Status announcements

### **Visual Accessibility**
- High contrast error states
- Clear focus indicators
- Consistent color usage

## Integration Points

### **PDF Components**
- `PDFUploadZone`: File upload with drag & drop
- `PDFPreviewComponent`: Processing and preview display

### **API Endpoints**
- `POST /api/products`: Create new product
- `PUT /api/products/:id`: Update existing product
- Handles PDF file references and metadata

### **State Persistence**
- Auto-saves PDF processing results
- Maintains form state during processing
- Clears state on modal close

## Styling & Theming

### **Color Scheme**
Uses MJK Prints brand colors from Tailwind config:
- `primary`: #2c3e50 (sophisticated dark blue)
- `secondary`: #e0bfb8 (warm blush pink)
- `accent`: #f5f0e6 (elegant light ivory)
- `success`: #27ae60 (green)
- `error`: #e74c3c (red)

### **Responsive Design**
- Full-screen on mobile
- Optimized layout for tablets
- Professional desktop appearance
- Maintains usability across all screen sizes

## Error Handling

### **PDF Upload Errors**
- File size validation (50MB limit)
- File type validation (PDF only)
- Network errors during upload
- Processing failures

### **Form Validation Errors**
- Empty required fields
- Invalid price values
- Invalid image URLs
- Missing PDF or image data

### **API Errors**
- Network connectivity issues
- Server validation failures
- Authentication problems
- Database constraint violations

## Performance Considerations

### **Optimizations**
- Lazy loading of PDF preview images
- Debounced form validation
- Efficient re-rendering with proper dependencies
- Memory cleanup on component unmount

### **Best Practices**
- Minimal re-renders during typing
- Proper event listener cleanup
- Optimistic UI updates where appropriate
- Error boundary compatibility

## Browser Support

- Modern browsers with ES6+ support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Mobile browsers on iOS 12+ and Android 7+
- Progressive enhancement for older browsers

## Dependencies

### **React Dependencies**
- React 18+ with hooks support
- Proper event handling and state management

### **Component Dependencies**
- `PDFUploadZone`: PDF file upload handling
- `PDFPreviewComponent`: PDF processing and preview

### **Environment Variables**
- `NEXT_PUBLIC_SUPABASE_URL`: For image URL generation

## Testing Recommendations

### **Unit Tests**
- Form validation logic
- State management functions
- PDF upload integration
- Error handling scenarios

### **Integration Tests**
- Complete add product flow
- Complete edit product flow
- PDF upload and processing
- Form submission with API

### **E2E Tests**
- Full user journey from dashboard to product creation
- Error recovery scenarios
- Cross-browser compatibility
- Mobile responsiveness

---

*This component provides a production-ready solution for product management in the MJK Prints dashboard with comprehensive PDF upload support and professional user experience.*