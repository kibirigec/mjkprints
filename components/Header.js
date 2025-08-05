import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import CartDrawer from './CartDrawer'

export default function Header() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { cart } = useCart()
  
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0)

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Etsy Style */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
                <span className="text-accent font-bold text-xl">M</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-2xl font-bold text-primary group-hover:text-secondary transition-colors duration-200">MJK Prints</span>
                <div className="text-xs text-gray-500 -mt-1">Digital Art Gallery</div>
              </div>
            </Link>

            {/* Simplified Navigation - More like Etsy */}
            <nav className="hidden lg:flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                Home
              </Link>
              <Link href="/gallery" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                All Art
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                Sell on MJK
              </Link>
            </nav>

            {/* Right Side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Compact Search for Header */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for anything"
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary w-64 bg-white text-sm"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  
                </div>
              </div>

              {/* Mobile Search Icon */}
              <button className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Favorites */}
              <button className="hidden sm:block p-2 text-gray-700 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>

              {/* Account */}
              <Link href="/dashboard" className="p-2 text-gray-700 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

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
              <button className="lg:hidden p-2 text-gray-700 hover:text-primary transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu - Hidden by default */}
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-col space-y-3">
              <Link href="/" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                Home
              </Link>
              <Link href="/gallery" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                All Art
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-primary transition-colors font-medium text-sm">
                Sell on MJK
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}