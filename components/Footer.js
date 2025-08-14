import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-primary text-accent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="relative w-8 h-8">
                <Image
                  src="/images/mjklogo.jpg"
                  alt="MJK Prints Logo"
                  fill
                  className="object-contain"
                  sizes="32px"
                />
              </div>
              <span className="text-xl font-bold">MJK Prints</span>
            </Link>
            <p className="text-accent/80 mb-4 max-w-md">
              Discover unique digital prints from independent designers. High-quality, instant downloads for your creative projects.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Shop</h3>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Sell</h3>
          </div>
        </div>

        <div className="border-t border-accent/20 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-accent/60 text-sm">
            © 2024 MJK Prints. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <Link href="/" className="text-accent/60 hover:text-accent text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="text-accent/60 hover:text-accent text-sm transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}