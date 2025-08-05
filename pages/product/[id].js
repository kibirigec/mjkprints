import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { useCart } from '../../context/CartContext'

export default function ProductPage({ product }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [isAdded, setIsAdded] = useState(false)

  if (router.isFallback) {
    return (
      <div className="min-h-screen bg-accent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-primary">Loading product...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-accent">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-8">The product you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Back to Home
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart(product)
    setIsAdded(true)
    setTimeout(() => setIsAdded(false), 2000)
  }

  return (
    <>
      <Head>
        <title>{product.title} - MJK Prints</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image} />
      </Head>

      <div className="min-h-screen bg-accent">
        <Header />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-info">
              <Link href="/" className="hover:underline">Home</Link>
              <span className="text-gray-500">›</span>
              <Link href="/#products" className="hover:underline">Digital Art</Link>
              <span className="text-gray-500">›</span>
              <span className="text-gray-600">{product.title}</span>
            </div>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Product Images */}
            <div className="lg:col-span-5">
              <div className="bg-white p-4 border border-gray-200">
                <div className="relative aspect-square bg-gray-100 mb-4">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                </div>
                
                {/* Thumbnail images would go here */}
                <div className="flex space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-12 h-12 bg-gray-200 border border-gray-300 cursor-pointer hover:border-secondary"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="lg:col-span-4">
              <div className="bg-white p-6 border border-gray-200">
                <h1 className="text-2xl font-normal text-primary mb-3">
                  {product.title}
                </h1>
                
                <div className="flex items-center mb-4">
                  <div className="flex items-center mr-2">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 15l-5.5 3 1-6.5L0 6l6.5-1L10 0l3.5 5L20 6l-5.5 5.5 1 6.5z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-info text-sm hover:underline cursor-pointer">
                    {Math.floor(Math.random() * 500) + 50} ratings
                  </span>
                </div>

                <hr className="my-4" />

                <div className="mb-4">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-normal text-red-600">
                      ${product.price}
                    </span>
                    {Math.random() > 0.5 && (
                      <span className="text-sm text-gray-500 line-through ml-2">
                        ${(parseFloat(product.price) * 1.4).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    FREE instant download
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Product Features */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>High resolution (300 DPI)</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Multiple formats (JPEG, PNG, PDF)</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Commercial use license</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Buy Box */}
            <div className="lg:col-span-3">
              <div className="bg-white p-4 border border-gray-200 sticky top-4">
                <div className="mb-4">
                  <div className="text-2xl font-normal text-red-600 mb-2">
                    ${product.price}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    FREE instant download
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdded}
                    className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors shadow-sm ${
                      isAdded
                        ? 'bg-success text-white'
                        : 'bg-secondary hover:bg-secondary-dark text-primary'
                    }`}
                  >
                    {isAdded ? '✓ Added to Cart!' : 'Add to Cart'}
                  </button>

                  <button className="w-full py-2 px-4 bg-secondary hover:bg-secondary-dark text-primary rounded text-sm font-medium transition-colors shadow-sm">
                    Buy Now
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Secure transaction</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Instant download</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0121 12a11.955 11.955 0 01-2.382 7.016M3.382 5.016A11.955 11.955 0 001 12a11.955 11.955 0 002.382 7.016" />
                    </svg>
                    <span>Lifetime access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Information Tabs */}
          <div className="mt-8 bg-white border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button className="py-4 px-1 border-b-2 border-secondary text-sm font-medium text-info">
                  Product Details
                </button>
                <button className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-primary">
                  Customer Reviews
                </button>
                <button className="py-4 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-primary">
                  Q&A
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-medium text-primary mb-4">Product Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">File Information</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Format:</dt>
                      <dd className="text-gray-900">JPEG, PNG, PDF</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Resolution:</dt>
                      <dd className="text-gray-900">300 DPI</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Size:</dt>
                      <dd className="text-gray-900">Various sizes included</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">License</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Usage:</dt>
                      <dd className="text-gray-900">Personal & Commercial</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Prints:</dt>
                      <dd className="text-gray-900">Unlimited</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Frequently Bought Together */}
          <div className="mt-8 bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-primary mb-4">Frequently bought together</h3>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-200 flex-shrink-0"></div>
              <span className="text-2xl">+</span>
              <div className="w-20 h-20 bg-gray-200 flex-shrink-0"></div>
              <span className="text-2xl">+</span>
              <div className="w-20 h-20 bg-gray-200 flex-shrink-0"></div>
              <div className="ml-8">
                <div className="text-sm text-gray-600 mb-2">Total price:</div>
                <div className="text-xl font-bold text-red-600 mb-4">
                  ${(parseFloat(product.price) * 3).toFixed(2)}
                </div>
                <button className="bg-secondary hover:bg-secondary-dark text-primary px-4 py-2 rounded text-sm font-medium shadow-sm">
                  Add all three to Cart
                </button>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

export async function getStaticPaths() {
  try {
    const { getAllProducts } = await import('../../lib/supabase')
    const products = await getAllProducts()
    
    const paths = products.map((product) => ({
      params: { id: product.id.toString() },
    }))

    return { paths, fallback: true }
  } catch (error) {
    return { paths: [], fallback: true }
  }
}

export async function getStaticProps({ params }) {
  try {
    const { getProductById } = await import('../../lib/supabase')
    const product = await getProductById(params.id)
    
    if (!product) {
      return { notFound: true }
    }
    
    return {
      props: { product },
      revalidate: 60,
    }
  } catch (error) {
    return { notFound: true }
  }
}