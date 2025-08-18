import { supabase, supabaseAdmin } from './client.js';
import { getFileUploadById, getFileStorageUrl } from './files.js';

export const createProduct = async (productData) => {
  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('products')
    .insert([{
      title: productData.title,
      description: productData.description,
      price: productData.price,
      image: productData.image,
      image_file_id: productData.image_file_id || null,
      pdf_file_id: productData.pdf_file_id || null
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`);
  }
  return data;
};

export const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      pdf_file:file_uploads!pdf_file_id (id, file_name, file_size, file_type, processing_status, preview_urls, thumbnail_urls, dimensions, page_count, storage_path),
      image_file:file_uploads!image_file_id (id, file_name, file_size, file_type, processing_status, dimensions, image_variants, thumbnail_urls, color_profile, orientation, storage_path)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GETALLPRODUCTS] Database error:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
  return data || [];
};

export const getProductById = async (id) => {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      pdf_file:file_uploads!pdf_file_id (id, file_name, file_size, file_type, processing_status, preview_urls, thumbnail_urls, dimensions, page_count, storage_path),
      image_file:file_uploads!image_file_id (id, file_name, file_size, file_type, processing_status, dimensions, image_variants, thumbnail_urls, color_profile, orientation, storage_path)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
  return data;
};

export const updateProduct = async (id, productData) => {
  const client = supabaseAdmin || supabase;
  const updateData = {
    title: productData.title,
    description: productData.description,
    price: productData.price,
    image: productData.image,
    updated_at: new Date().toISOString()
  };
  
  if (productData.hasOwnProperty('pdf_file_id')) {
    updateData.pdf_file_id = productData.pdf_file_id;
  }
  if (productData.hasOwnProperty('image_file_id')) {
    updateData.image_file_id = productData.image_file_id;
  }
  
  const { data, error } = await client
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[UPDATEPRODUCT] Database error:', error);
    throw new Error(`Failed to update product: ${error.message}`);
  }
  return data;
};

export const deleteProduct = async (id) => {
  const client = supabaseAdmin || supabase;
  if (!supabaseAdmin) {
    throw new Error('Server configuration error: Product deletion requires admin privileges. Please contact support.');
  }

  try {
    const { data: productData, error: fetchError } = await client
      .from('products')
      .select(`*,
        file_uploads:pdf_file_id(id, storage_path, file_name),
        image_uploads:image_file_id(id, storage_path, file_name)`)
      .eq('id', id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch product: ${fetchError.message}`);
    }
    if (!productData) {
      throw new Error('Product not found');
    }

    const { data, error: deleteError } = await client
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (deleteError) {
      if (deleteError.message.includes('new row violates row-level security policy')) {
        throw new Error('Permission denied: Insufficient privileges to delete product. Admin access required.');
      } else if (deleteError.message.includes('violates foreign key constraint')) {
        throw new Error('Cannot delete product: It is referenced by existing orders or downloads.');
      } else {
        throw new Error(`Failed to delete product: ${deleteError.message}`);
      }
    }

    const filesToCleanup = [];
    if (productData.file_uploads?.storage_path) {
      filesToCleanup.push(productData.file_uploads.storage_path);
    }
    if (productData.image_uploads?.storage_path) {
      filesToCleanup.push(productData.image_uploads.storage_path);
    }

    if (filesToCleanup.length > 0) {
      try {
        const { error: storageError } = await client.storage
          .from('mjk-prints-storage')
          .remove(filesToCleanup);
        if (storageError) {
          console.warn(`[PRODUCT-DELETE] Storage cleanup failed (non-critical):`, storageError.message);
        }
      } catch (storageCleanupError) {
        console.warn(`[PRODUCT-DELETE] Storage cleanup error (non-critical):`, storageCleanupError.message);
      }
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const createProductWithFile = async (productData, fileId, fileType) => {
  try {
    if (fileId) {
      const fileUpload = await getFileUploadById(fileId);
      if (!fileUpload) {
        throw new Error(`${fileType.toUpperCase()} file not found: ${fileId}. Please ensure the file was uploaded successfully.`);
      }
      if (fileUpload.file_type !== fileType) {
        throw new Error(`File type mismatch: expected ${fileType}, got ${fileUpload.file_type}`);
      }
      if (fileUpload.processing_status !== 'completed') {
        throw new Error(`${fileType.toUpperCase()} file is not ready: status is '${fileUpload.processing_status}'. Please wait for processing to complete.`);
      }
      if (fileType === 'pdf') {
        productData.pdf_file_id = fileId;
      } else if (fileType === 'image') {
        productData.image_file_id = fileId;
        if (fileUpload.storage_path) {
          const actualImageUrl = getFileStorageUrl(fileUpload.storage_path);
          productData.image = actualImageUrl;
        }
      }
    }
    
    const product = await createProduct(productData);
    
    if (fileId) {
      const fileUpload = await getFileUploadById(fileId);
      return {
        ...product,
        [`${fileType}_file_upload`]: fileUpload
      };
    }
    return product;
  } catch (error) {
    throw error;
  }
};

export const createProductWithPDF = async (productData, fileId) => {
  return await createProductWithFile(productData, fileId, 'pdf');
};

export const createProductWithImage = async (productData, fileId) => {
  return await createProductWithFile(productData, fileId, 'image');
};

export const updateProductWithFileInfo = async (productId, fileData, fileType) => {
  try {
    const updateData = {
      file_dimensions: fileData.file_dimensions,
      updated_at: new Date().toISOString()
    };
    
    if (fileType === 'pdf') {
      updateData.page_count = fileData.page_count;
      updateData.print_specifications = fileData.print_specifications;
      updateData.preview_pages = fileData.preview_pages;
    }
    
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product with ${fileType} info: ${error.message}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
};

export const updateProductWithPDFInfo = async (productId, pdfData) => {
  return await updateProductWithFileInfo(productId, pdfData, 'pdf');
};

export const updateProductWithImageInfo = async (productId, imageData) => {
  return await updateProductWithFileInfo(productId, imageData, 'image');
};

export const getProductImage = (product, variant = 'medium') => {
  try {
    if (!product) {
      return null;
    }
    if (product.image_file && product.image_file.storage_path) {
      return {
        url: getFileStorageUrl(product.image_file.storage_path),
        source: 'uploaded_image',
        dimensions: product.image_file.dimensions
      };
    }
    if (product.pdf_file && product.pdf_file.processing_status === 'completed') {
      if (product.pdf_file.thumbnail_urls && product.pdf_file.thumbnail_urls[variant]) {
        return {
          url: product.pdf_file.thumbnail_urls[variant],
          source: 'pdf_thumbnail',
          dimensions: product.pdf_file.dimensions
        };
      }
      if (product.pdf_file.preview_urls && product.pdf_file.preview_urls.length > 0) {
        return {
          url: product.pdf_file.preview_urls[0],
          source: 'pdf_preview',
          dimensions: product.pdf_file.dimensions
        };
      }
    }
    if (product?.image) {
      return {
        url: product.image,
        source: 'external_url'
      };
    }
    return null;
  } catch (error) {
    if (product?.image) {
      return {
        url: product.image,
        source: 'external_url_fallback'
      };
    }
    return null;
  }
};

export const getProductImageVariants = (product) => {
  const variants = {};
  if (product.image_file && product.image_file.processing_status === 'completed') {
    if (product.image_file.image_variants) {
      Object.keys(product.image_file.image_variants).forEach(variant => {
        variants[variant] = {
          url: product.image_file.image_variants[variant].url,
          width: product.image_file.image_variants[variant].width,
          height: product.image_file.image_variants[variant].height,
          source: 'uploaded'
        };
      });
    }
    if (product.image_file.thumbnail_urls) {
      Object.keys(product.image_file.thumbnail_urls).forEach(variant => {
        if (!variants[variant]) {
          variants[variant] = {
            url: product.image_file.thumbnail_urls[variant],
            source: 'uploaded_thumbnail'
          };
        }
      });
    }
  }
  if (Object.keys(variants).length === 0 && product.pdf_file && product.pdf_file.processing_status === 'completed') {
    if (product.pdf_file.thumbnail_urls) {
      Object.keys(product.pdf_file.thumbnail_urls).forEach(variant => {
        variants[variant] = {
          url: product.pdf_file.thumbnail_urls[variant],
          source: 'pdf_thumbnail'
        };
      });
    }
  }
  if (product.image) {
    variants.external = {
      url: product.image,
      source: 'external'
    };
  }
  return variants;
};

export const getProductsWithFileType = async (fileType) => {
  if (!['pdf', 'image'].includes(fileType)) {
    throw new Error('Invalid file type: must be either "pdf" or "image"');
  }
  const fileColumn = fileType === 'pdf' ? 'pdf_file_id' : 'image_file_id';
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      file_uploads!${fileColumn} (id, file_name, file_size, file_type, processing_status, dimensions, ${fileType === 'pdf' ? 'page_count, preview_urls' : 'image_variants, color_profile, orientation'}, thumbnail_urls, storage_path)
    `)
    .not(fileColumn, 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch products with ${fileType} files: ${error.message}`);
  }
  return data || [];
};
