import '../styles/globals.css'
import { CartProvider } from '../context/CartContext'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <Head>
        <title>MJK Prints - Digital Art Store</title>
        <meta name="description" content="Discover unique digital prints from independent designers" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </CartProvider>
  )
}