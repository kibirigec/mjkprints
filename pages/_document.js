import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <meta name="theme-color" content="#2c3e50" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}