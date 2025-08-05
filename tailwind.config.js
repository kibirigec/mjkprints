/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          'dark-blue': '#2c3e50',
          'blush': '#e0bfb8',
          'light-ivory': '#f5f0e6',
        },
        primary: '#2c3e50', // Sophisticated dark blue
        secondary: '#e0bfb8', // Warm blush pink
        accent: '#f5f0e6', // Elegant light ivory
        // Creative color variations for enhanced design
        'primary-light': '#34495e',
        'primary-dark': '#1a252f',
        'secondary-light': '#e8c7c0',
        'secondary-dark': '#d8b3a8',
        'accent-dark': '#eae5da',
        // Supporting colors for better UX
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c',
        info: '#3498db',
        // Neutral colors
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}