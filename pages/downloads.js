import { useState } from 'react'
import Head from 'next/head'
import Image from 'next/image'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function DownloadsPage() {
  const [email, setEmail] = useState('')
  const [downloads, setDownloads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDownloads = async (e) => {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/downloads?email=${encodeURIComponent(email)}`)
      
      if (response.ok) {
        const data = await response.json()
        setDownloads(data)
        
        if (data.length === 0) {
          setError('No downloads found for this email address')
        }
      } else {
        setError('Failed to fetch downloads. Please try again.')
      }
    } catch (err) {
      setError('Failed to fetch downloads. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>My Downloads - MJK Prints</title>
        <meta name="description" content="Access your digital art downloads" />
      </Head>

      <div className="min-h-screen bg-accent">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1 className="text-3xl font-bold text-primary mb-8 text-center">My Downloads</h1>

          {/* Email Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-primary mb-4">Access Your Downloads</h2>
            <p className="text-gray-600 mb-6">
              Enter the email address you used for your purchase to view your download links.
            </p>

            <form onSubmit={fetchDownloads} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Searching...' : 'Find My Downloads'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          {/* Downloads List */}
          {downloads.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold text-primary mb-6">
                Your Digital Downloads ({downloads.length})
              </h2>
              
              <div className="space-y-4">
                {downloads.map((download) => (
                  <div key={download.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 relative bg-gray-200 rounded-lg overflow-hidden">
                        {download.products?.image ? (
                          <Image
                            src={download.products.image}
                            alt={download.products.title || 'Digital Artwork'}
                            fill
                            sizes="(max-width: 640px) 64px, 80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-primary mb-2">
                          {download.products?.title || 'Digital Artwork'}
                        </h3>
                        
                        <p className="text-gray-600 mb-3 text-sm">
                          {download.products?.description || 'Digital download'}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Downloaded: {download.download_count}/{download.max_downloads}</span>
                          <span>•</span>
                          <span>Expires: {new Date(download.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Download Button */}
                      <div className="flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                        {new Date(download.expires_at) > new Date() ? (
                          <a
                            href={download.download_url}
                            className="block sm:inline-block bg-secondary hover:bg-secondary-dark text-primary px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="block sm:inline-block bg-gray-300 text-gray-600 px-6 py-3 rounded-lg font-semibold text-center">
                            Expired
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {download.download_count >= download.max_downloads && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          ⚠️ Maximum downloads reached. Contact support if you need additional downloads.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Download Tips</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Save files immediately after download</li>
                  <li>• Links expire 7 days after purchase</li>
                  <li>• Each file can be downloaded up to 5 times</li>
                  <li>• Contact support@mjkprints.com if you need help</li>
                </ul>
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}