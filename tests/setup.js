/**
 * Jest setup file for MJK Prints test suite
 * This file is loaded before all tests run
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Global test utilities
global.mockConsole = () => {
  const originalConsole = console
  
  beforeEach(() => {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })
  
  afterEach(() => {
    console.log = originalConsole.log
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  })
}

// Common test data fixtures
global.testFixtures = {
  // Legacy array format preview URLs
  legacyArrayFormat: [
    'https://example.com/preview1.jpg',
    'https://example.com/preview2.jpg', 
    'https://example.com/preview3.jpg'
  ],
  
  // New object format preview URLs
  objectFormat: {
    small: 'https://example.com/small-preview.jpg',
    medium: 'https://example.com/medium-preview.jpg',
    large: 'https://example.com/large-preview.jpg'
  },
  
  // Mixed valid/invalid URLs
  mixedValidInvalid: [
    'https://example.com/valid1.jpg',
    'invalid-url',
    'https://example.com/valid2.jpg',
    '',
    'https://example.com/valid3.jpg'
  ],
  
  // Malicious URL attempts
  maliciousUrls: [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
    'ftp://example.com/file.jpg'
  ],
  
  // Valid but edge case URLs
  edgeCaseUrls: [
    'https://example.com/file%20with%20spaces.jpg',
    'https://example.com/file-with-very-long-name-that-might-cause-issues.jpg',
    'https://sub.domain.example.com/path/to/file.jpg'
  ]
}

// Mock fetch for HTTP requests in tests
global.fetch = jest.fn()

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})