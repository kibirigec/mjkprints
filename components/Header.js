import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import CartDrawer from './CartDrawer'
import FavoritesDrawer from './FavoritesDrawer'

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { cart } = useCart()
  const { favorites } = useFavorites()
  
  const cartItemsCount = cart.length
  const favoritesCount = favorites.length

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <Image
                  src="/images/mjklogo.jpg"
                  alt="MJK Prints Logo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 40px, 48px"
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors duration-200">MJK Prints</span>
                <div className="text-xs text-gray-500 -mt-1">Digital Art Gallery</div>
              </div>
            </Link>

            {/* Simplified Navigation */}
            <nav className="hidden lg:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                Home
              </Link>
            </nav>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Favorites */}
              <button 
                onClick={() => setIsFavoritesOpen(true)}
                className="hidden sm:block relative p-2 text-gray-700 hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
                    {favoritesCount}
                  </span>
                )}
              </button>


              {/* Cart */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-700 hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z" />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary text-primary text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]">
                    {cartItemsCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-primary transition-colors"
                aria-label="Toggle mobile menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex flex-col space-y-4">
                {/* Navigation Links */}
                <Link 
                  href="/" 
                  className="text-gray-700 hover:text-primary transition-colors font-medium text-base py-2 px-2 rounded-md hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
                
                {/* Mobile Favorites */}
                <button
                  onClick={() => {
                    setIsFavoritesOpen(true)
                    setIsMobileMenuOpen(false)
                  }}
                  className="flex items-center space-x-3 text-gray-700 hover:text-primary transition-colors font-medium text-base py-2 px-2 rounded-md hover:bg-gray-50 text-left"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Favorites</span>
                  {favoritesCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {favoritesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <FavoritesDrawer isOpen={isFavoritesOpen} onClose={() => setIsFavoritesOpen(false)} />
    </>
  )
}