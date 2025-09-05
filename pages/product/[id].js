import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import { generateModalLink } from '../../utils/urlUtils'

export default function ProductPage({ product }) {
  const router = useRouter()

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

  const modalUrl = generateModalLink(product.id);

  return (
    <>
      <Head>
        <title>{product.title} - MJK Prints</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.image} />
        <meta property="og:url" content={`https://www.mjkprints.com/product/${product.id}`} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="MJK Prints" />
      </Head>

      <div className="min-h-screen bg-accent">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="relative h-96 w-full">
              <Image
                src={product.image}
                alt={product.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="p-8 text-center">
              <h1 className="text-3xl font-bold text-primary mb-2">{product.title}</h1>
              <p className="text-gray-600 mb-6">{product.description}</p>
              <Link href={modalUrl} passHref>
                <a className="inline-block bg-secondary hover:bg-secondary-dark text-primary font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-300">
                  View in Store
                </a>
              </Link>
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