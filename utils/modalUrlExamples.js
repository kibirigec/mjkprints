/**
 * Modal URL Examples and Usage Guide
 * Demonstrates different ways to create shareable product modal links
 */

import { generateModalLink, generateProductLink, generateShareableModalLink } from './urlUtils'

// Example product ID (replace with actual product IDs from your database)
const EXAMPLE_PRODUCT_ID = 'd79f8300-ea32-4533-b9b8-3665e2e1706b'

/**
 * Examples of different modal URL patterns
 */
export const modalUrlExamples = {
  // Homepage with modal overlay
  homepageModal: generateModalLink(EXAMPLE_PRODUCT_ID),
  // Result: "/?modal=true&id=d79f8300-ea32-4533-b9b8-3665e2e1706b"

  // Full static product page 
  staticProduct: generateProductLink(EXAMPLE_PRODUCT_ID),
  // Result: "/product/d79f8300-ea32-4533-b9b8-3665e2e1706b"

  // Shareable modal link with full domain
  shareableModal: generateShareableModalLink(EXAMPLE_PRODUCT_ID),
  // Result: "http://localhost:3001/?modal=true&id=d79f8300-ea32-4533-b9b8-3665e2e1706b"
}

/**
 * Usage examples for different scenarios
 */
export const usageExamples = {
  // Social media sharing
  socialShare: (productId) => {
    const shareUrl = generateShareableModalLink(productId)
    return `Check out this amazing digital art: ${shareUrl}`
  },

  // Email marketing
  emailLink: (productId, productTitle) => {
    const modalUrl = generateModalLink(productId) 
    return {
      text: `View "${productTitle}"`,
      href: modalUrl,
      target: '_blank' // Opens in new tab with modal
    }
  },

  // Internal navigation
  internalNavigation: (productId) => {
    return {
      href: generateModalLink(productId),
      shallow: true // Use with Next.js router for smooth navigation
    }
  },

  // SEO-friendly product page
  seoFriendly: (productId) => {
    return generateProductLink(productId) // Full page for search engines
  }
}

/**
 * Expected behaviors for different URL patterns
 */
export const urlBehaviors = {
  '/?modal=true&id=123': 'Opens product modal on homepage',
  '/product/123': 'Shows full product page (SEO-friendly)',
  '/product/123?modal=true': 'Redirects to homepage with modal open',
  '/': 'Shows homepage without modal',
  '/?id=123': 'Shows homepage without modal (modal param required)',
  '/?modal=true': 'Shows homepage without modal (id param required)'
}

/**
 * Browser navigation expectations
 */
export const navigationBehaviors = {
  modalOpen: {
    backButton: 'Closes modal and returns to homepage',
    forwardButton: 'Reopens modal if it was previously open',
    refreshPage: 'Modal remains open (URL-synced state)',
    directNavigation: 'Modal opens directly from URL'
  },
  modalClosed: {
    backButton: 'Normal browser navigation',
    forwardButton: 'Normal browser navigation', 
    refreshPage: 'Homepage loads normally',
    directNavigation: 'Homepage loads normally'
  }
}

/**
 * Test cases for validation
 */
export const testCases = [
  {
    description: 'Click product card should open modal with URL update',
    action: 'Click ProductCard',
    expectedUrl: '/?modal=true&id={productId}',
    expectedBehavior: 'Modal opens, URL updates, browser history updated'
  },
  {
    description: 'Close modal should return to homepage',
    action: 'Click modal close button',
    expectedUrl: '/',
    expectedBehavior: 'Modal closes, URL clears, can use back button to reopen'
  },
  {
    description: 'Direct modal URL navigation should work',
    action: 'Navigate to /?modal=true&id=123',
    expectedUrl: '/?modal=true&id=123',
    expectedBehavior: 'Homepage loads with modal already open'
  },
  {
    description: 'Product page modal redirect should work',
    action: 'Navigate to /product/123?modal=true',
    expectedUrl: '/?modal=true&id=123',
    expectedBehavior: 'Redirects to homepage with modal open'
  },
  {
    description: 'Share button should copy shareable URL',
    action: 'Click share button in modal',
    expectedBehavior: 'Full URL copied to clipboard',
    expectedClipboard: 'http://localhost:3001/?modal=true&id={productId}'
  },
  {
    description: 'Browser back button should close modal',
    action: 'Press browser back button when modal is open',
    expectedUrl: '/',
    expectedBehavior: 'Modal closes, returns to previous page state'
  }
]

export default {
  modalUrlExamples,
  usageExamples,
  urlBehaviors,
  navigationBehaviors,
  testCases
}