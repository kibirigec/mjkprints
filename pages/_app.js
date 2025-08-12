import '../styles/globals.css'
import { CartProvider } from '../context/CartContext'
import { FavoritesProvider } from '../context/FavoritesContext'
import { AdminAuthProvider } from '../context/AdminAuthContext'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <FavoritesProvider>
        <AdminAuthProvider>
          <Head>
            <title>MJK Prints - Digital Art Store</title>
            <meta name="description" content="Discover unique digital prints from independent designers" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Component {...pageProps} />
        </AdminAuthProvider>
      </FavoritesProvider>
    </CartProvider>
  )
}