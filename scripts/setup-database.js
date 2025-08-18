// Database setup script for MJK Prints
// Run this after setting up your Supabase project and environment variables

import { supabase } from '../lib/supabase.js'

const sampleProducts = [
  {
    title: "Abstract Watercolor Mountains",
    description: "Beautiful abstract mountain landscape in soft watercolor tones. Perfect for modern home decor and office spaces.",
    price: 15.99,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop&crop=center"
  },
  {
    title: "Minimalist Geometric Pattern",
    description: "Clean and modern geometric design with neutral colors. Ideal for contemporary interior design projects.",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop&crop=center"
  },
  {
    title: "Botanical Line Art Collection",
    description: "Elegant botanical illustrations in minimalist line art style. Set of 3 prints featuring different plant species.",
    price: 24.99,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=800&fit=crop&crop=center"
  },
  {
    title: "Vintage Typography Poster",
    description: "Retro-inspired typography design with motivational quote. Perfect for creative spaces and home offices.",
    price: 18.99,
    image: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&crop=center"
  },
  {
    title: "Ocean Wave Abstract",
    description: "Flowing abstract design inspired by ocean waves. Calming blue and white color palette for peaceful spaces.",
    price: 16.99,
    image: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&h=800&fit=crop&crop=center"
  },
  {
    title: "Modern Art Deco Pattern",
    description: "Sophisticated Art Deco inspired pattern in gold and black. Luxury design perfect for elegant interiors.",
    price: 22.99,
    image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&h=800&fit=crop&crop=center"
  }
]

async function setupDatabase() {
  try {
    
    // Check if we can connect to Supabase
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .limit(1)

    if (fetchError) {
      console.error('❌ Failed to connect to Supabase:', fetchError.message)
      return
    }

    // Check if products already exist
    if (existingProducts && existingProducts.length > 0) {
      return
    }

    // Insert sample products
    
    const { data, error } = await supabase
      .from('products')
      .insert(sampleProducts)
      .select()

    if (error) {
      console.error('❌ Failed to insert sample products:', error.message)
      return
    }

    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
  }
}

// Run the setup
setupDatabase()