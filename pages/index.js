import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import CustomerPreviewModal from '../components/CustomerPreviewModal'
import ProductSkeleton from '../components/ProductSkeleton'
import { normalizeProductList } from '../utils/productUtils'
import { generateModalLink, isModalUrl, getProductIdFromQuery } from '../utils/urlUtils'

export default function Home({ featuredProducts }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false) // Remove artificial loading
  
  // Normalize products data for consistent handling and sort by creation date (newest first)
  const normalizedProducts = normalizeProductList(featuredProducts || []).sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0)
    const dateB = new Date(b.created_at || b.createdAt || 0)
    return dateB - dateA // Newest first
  })
  
  // Extract modal state from URL parameters using utility functions
  const isModalOpen = isModalUrl(router.query)
  const modalProductId = getProductIdFromQuery(router.query)
  
  // Find the selected product based on URL parameter
  const selectedProduct = modalProductId 
    ? normalizedProducts.find(product => product.id === modalProductId)
    : null

  const openProductModal = (product) => {
    const modalUrl = generateModalLink(product.id)
    router.push(modalUrl, undefined, { shallow: true })
  }

  const closeProductModal = () => {
    router.push('/', undefined, { shallow: true })
  }


  return (
    <>
      <Head>
        <title>MJK Prints - Unique Digital Art Prints</title>
        <meta name="description" content="Discover unique digital prints from independent designers. High-quality, instant downloads for your creative projects." />
        <link rel="dns-prefetch" href="//images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
      </Head>

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section - Erin Condren Style */}
          <section className="py-8 md:py-16" style={{backgroundColor: '#F6F1E8'}}>
            {/* Mobile and Tablet: Image with Text Overlay */}
            <div className="lg:hidden max-w-7xl mx-auto px-4 sm:px-6">
              <div className="relative h-[400px] md:h-[500px] overflow-hidden rounded-lg">
                {/* Background Image */}
                <Image 
                  src="/images/formobile.webp"
                  alt="Digital Art Collection"
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 0px"
                />
                
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/40"></div>
                
                {/* Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 w-full max-w-lg sm:max-w-xl text-center rounded-lg shadow-lg">
                    <p className="text-xs sm:text-sm uppercase tracking-wide text-white mb-2">NEW 2025-2026</p>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2 leading-tight">
                      Best-Selling
                    </h1>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold italic text-secondary mb-4 leading-tight">
                      Digital Planners
                    </h2>
                    
                    <button 
                      onClick={() => document.getElementById('browse-section').scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 bg-primary text-white font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-primary-light transition-colors duration-200 mb-4 rounded-md"
                    >
                      SHOP NOW
                    </button>

                    {/* Key Benefits - Simple List */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-700">
                      <div className="flex items-center space-x-1">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Goal setting</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Daily layouts</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Organized productivity</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-green-500 font-bold">•</span>
                        <span>Instant download</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Full-Width Background with Text Overlay */}
            <div className="hidden lg:block relative h-[500px]">
              {/* Background Image */}
              <Image 
                src="/images/pln4.jpg"
                alt="Digital Art Collection"
                fill
                className="object-cover"
                priority
                sizes="(min-width: 1024px) 100vw, 0px"
              />

                {/* Text Overlay */}
                <div className="absolute inset-4 sm:inset-y-0 sm:right-8 flex items-center justify-center sm:justify-end pointer-events-none z-10">
                  <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-6 lg:p-8 max-w-sm sm:max-w-md lg:max-w-lg xl:w-[585px] shadow-lg text-center rounded-lg sm:rounded-none">
                    <p className="text-xs sm:text-sm uppercase tracking-wide text-gray-500 mb-2">NEW 2025-2026</p>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary mb-2 leading-tight">
                      Best-Selling
                    </h1>
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold italic text-secondary mb-4 sm:mb-6 leading-tight">
                      Digital Planners
                    </h2>
                    
                    {/* Shop Now Button */}
                    <button 
                      onClick={() => document.getElementById('browse-section').scrollIntoView({ behavior: 'smooth' })}
                      className="pointer-events-auto inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 bg-primary text-white font-bold text-xs sm:text-sm uppercase tracking-wide hover:bg-primary-light transition-colors duration-200 mb-4 sm:mb-6 rounded-md"
                    >
                      SHOP NOW
                    </button>

                    {/* Key Benefits - 2x2 Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-2 sm:gap-y-3">
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700">Goal setting & tracking</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700">Daily & weekly layouts</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700">Habit tracker included</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs sm:text-sm text-gray-700">Print & use immediately</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </section>


          {/* Browse All Products Section */}
          <section id="browse-section" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                  Browse All Digital Planners
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Find what suits your needs from our collection of digital planners
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {isLoading ? (
                  // Show skeleton cards while loading
                  Array.from({ length: 8 }).map((_, index) => (
                    <ProductSkeleton key={index} />
                  ))
                ) : (
                  normalizedProducts.map((product, index) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onProductClick={openProductModal}
                      isPriority={index < 10} // First 10 images get priority loading
                      showNewBadge={index < 2} // First 2 products get NEW badge
                    />
                  ))
                )}
              </div>

              {!isLoading && normalizedProducts.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-primary mb-2">Gallery Coming Soon</h3>
                  <p className="text-gray-600">We&apos;re curating amazing digital artwork for you!</p>
                </div>
              )}

            </div>
          </section>

          {/* Additional Promotional Section */}
          <section className="py-16 bg-gradient-to-r from-secondary/10 to-accent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                Boost your productivity with ease
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Explore our beautifully crafted digital planners designed to help you organize your life, set clear goals, and stay focused on what truly matters.                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>

      <CustomerPreviewModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={closeProductModal}
      />
    </>
  )
}

export async function getStaticProps() {
  try {
    const { getAllProducts } = await import('../lib/supabase')
    const featuredProducts = await getAllProducts()
    
    return {
      props: {
        featuredProducts,
      },
      revalidate: 60,
    }
  } catch (error) {
    console.log('Error fetching products:', error)
    return {
      props: {
        featuredProducts: [],
      }
    }
  }
}