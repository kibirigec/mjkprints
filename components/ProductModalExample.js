import { useState } from 'react';
import ProductModal from './ProductModal';

/**
 * Example component demonstrating ProductModal usage
 * This shows the basic integration patterns for the modal
 */
const ProductModalExample = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editProduct, setEditProduct] = useState(null);
  const [products, setProducts] = useState([]);

  // Open modal for adding new product
  const handleAddProduct = () => {
    setModalMode('add');
    setEditProduct(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing product
  const handleEditProduct = (product) => {
    setModalMode('edit');
    setEditProduct(product);
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditProduct(null);
  };

  // Handle successful save (refresh data, show notifications, etc.)
  const handleModalSave = (savedProduct) => {
    
    if (modalMode === 'add') {
      // Add new product to list
      setProducts(prev => [...prev, savedProduct]);
    } else {
      // Update existing product in list
      setProducts(prev => 
        prev.map(p => p.id === savedProduct.id ? savedProduct : p)
      );
    }
  };

  // Handle successful completion (optional additional actions)
  const handleModalSuccess = (savedProduct) => {
    // Could trigger notifications, analytics, etc.
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-primary mb-6">Product Modal Example</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleAddProduct}
          className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-light transition-colors"
        >
          Add New Product
        </button>

        {products.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-primary">Your Products:</h3>
            {products.map(product => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{product.title}</h4>
                  <p className="text-sm text-gray-600">${product.price}</p>
                </div>
                <button
                  onClick={() => handleEditProduct(product)}
                  className="text-secondary hover:text-secondary-dark transition-colors"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ProductModal Integration */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        editProduct={editProduct}
        onSave={handleModalSave}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default ProductModalExample;