import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/Header'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import CustomerPreviewModal from '../components/CustomerPreviewModal'
import ProductSkeleton from '../components/ProductSkeleton'
import { normalizeProductList } from '../utils/productUtils'

export default function Home({ featuredProducts }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Normalize products data for consistent handling
  const normalizedProducts = normalizeProductList(featuredProducts || [])

  useEffect(() => {
    // Simulate loading state even with static props
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 800)
    
    return () => clearTimeout(timer)
  }, [])

  const openProductModal = (product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const closeProductModal = () => {
    setSelectedProduct(null)
    setIsModalOpen(false)
  }


  return (
    <>
      <Head>
        <title>MJK Prints - Unique Digital Art Prints</title>
        <meta name="description" content="Discover unique digital prints from independent designers. High-quality, instant downloads for your creative projects." />
      </Head>

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section - Value Proposition */}
          <section className="bg-gradient-to-br from-accent via-white to-secondary/10 py-12 md:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6 leading-tight">
                  Discover unique
                  <span className="block text-secondary"> digital art</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                  Browse our curated collection of high-quality digital prints from independent artists. Instant downloads, unlimited creativity.
                </p>
                
                {/* Value Propositions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                      <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-primary mb-2">Instant Download</h3>
                    <p className="text-sm text-gray-600">Get your files immediately after purchase</p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                      <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-primary mb-2">Independent Artists</h3>
                    <p className="text-sm text-gray-600">Support creators directly with every purchase</p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4">
                      <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-primary mb-2">High Quality</h3>
                    <p className="text-sm text-gray-600">Premium digital files ready for any project</p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => document.getElementById('browse-section').scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center px-8 py-4 bg-primary text-white font-medium rounded-full hover:bg-primary-light transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Browse Collection
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <Link href="/gallery" className="inline-flex items-center px-8 py-4 border-2 border-primary text-primary font-medium rounded-full hover:bg-primary hover:text-white transition-all duration-300">
                    View All Art
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>


          {/* Browse All Products Section */}
          <section id="browse-section" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                  Browse All Artwork
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Discover unique digital art from our community of talented artists
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {isLoading ? (
                  // Show skeleton cards while loading
                  Array.from({ length: 8 }).map((_, index) => (
                    <ProductSkeleton key={index} />
                  ))
                ) : (
                  normalizedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onProductClick={openProductModal} />
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

              {/* View All Button */}
              {!isLoading && normalizedProducts.length > 0 && (
                <div className="text-center mt-12">
                  <Link href="/gallery" className="inline-flex items-center px-8 py-3 border-2 border-primary text-primary font-medium rounded-full hover:bg-primary hover:text-white transition-all duration-300">
                    View all artwork
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Additional Promotional Section */}
          <section className="py-16 bg-gradient-to-r from-secondary/10 to-accent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                  Join our creative community
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  Get inspired by thousands of digital artists and find the perfect piece for your next project
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard" className="inline-flex items-center px-8 py-3 bg-primary text-white font-medium rounded-full hover:bg-primary-light transition-all duration-300">
                    Start creating
                  </Link>
                  <Link href="/gallery" className="inline-flex items-center px-8 py-3 border-2 border-primary text-primary font-medium rounded-full hover:bg-primary hover:text-white transition-all duration-300">
                    Browse gallery
                  </Link>
                </div>
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