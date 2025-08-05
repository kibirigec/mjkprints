/**
 * Integration tests for preview API routes that use previewUtils
 * Tests the actual API endpoints with various preview URL formats
 */

import { createMocks } from 'node-mocks-http'
import previewHandler from '../pages/api/products/[id]/preview.js'

// Mock Supabase client
const mockSupabaseResponse = {
  data: null,
  error: null
}

const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => Promise.resolve(mockSupabaseResponse))
}

// Mock the supabase module
jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('Preview API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseResponse.data = null
    mockSupabaseResponse.error = null
  })

  describe('GET /api/products/[id]/preview', () => {
    test('should handle product with legacy array format preview URLs', async () => {
      const productData = {
        id: 'test-product-1',
        title: 'Test Product',
        pdf_file_id: 'test-file-id',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id',
          processing_status: 'completed',
          preview_urls: testFixtures.legacyArrayFormat,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-1' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.product_id).toBe('test-product-1')
      expect(responseData.preview_urls).toEqual(testFixtures.legacyArrayFormat)
      expect(responseData.preview_pages).toBe(3)
    })

    test('should handle product with new object format preview URLs', async () => {
      const productData = {
        id: 'test-product-2',
        title: 'Test Product 2',
        pdf_file_id: 'test-file-id-2',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id-2',
          processing_status: 'completed',
          preview_urls: testFixtures.objectFormat,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-2' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.product_id).toBe('test-product-2')
      expect(responseData.preview_urls).toEqual([
        'https://example.com/large-preview.jpg',
        'https://example.com/medium-preview.jpg',
        'https://example.com/small-preview.jpg'
      ])
    })

    test('should handle product with mixed valid/invalid URLs', async () => {
      const productData = {
        id: 'test-product-3',
        title: 'Test Product 3',
        pdf_file_id: 'test-file-id-3',
        page_count: 5,
        preview_pages: 5,
        file_uploads: {
          id: 'test-file-id-3',
          processing_status: 'completed',
          preview_urls: testFixtures.mixedValidInvalid,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-3' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.preview_urls).toEqual([
        'https://example.com/valid1.jpg',
        'https://example.com/valid2.jpg',
        'https://example.com/valid3.jpg'
      ])
      expect(responseData.preview_pages).toBe(3) // Only valid URLs
    })

    test('should return 404 when no valid preview URLs exist', async () => {
      const productData = {
        id: 'test-product-4',
        title: 'Test Product 4',
        pdf_file_id: 'test-file-id-4',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id-4',
          processing_status: 'completed',
          preview_urls: testFixtures.maliciousUrls,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-4' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('No preview images available for this PDF')
    })

    test('should return 202 when PDF is still processing', async () => {
      const productData = {
        id: 'test-product-5',
        title: 'Test Product 5',
        pdf_file_id: 'test-file-id-5',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id-5',
          processing_status: 'processing',
          preview_urls: null,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-5' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(202)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('PDF is still being processed')
      expect(responseData.processing_status).toBe('processing')
    })

    test('should return 404 when product not found', async () => {
      mockSupabaseResponse.data = null
      mockSupabaseResponse.error = { message: 'Not found' }

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent-product' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Product not found')
    })

    test('should return 404 when product has no PDF file', async () => {
      const productData = {
        id: 'test-product-6',
        title: 'Test Product 6',
        pdf_file_id: null,
        page_count: null,
        preview_pages: 3,
        file_uploads: null
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-6' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('No PDF file associated with this product')
      expect(responseData.product_type).toBe('image')
    })

    test('should return 400 when product ID is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Product ID is required')
    })

    test('should return 405 for non-GET methods', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'test-product' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Method not allowed')
    })

    test('should limit preview URLs to preview_pages setting', async () => {
      const longUrlArray = Array(10).fill().map((_, i) => 
        `https://example.com/preview${i + 1}.jpg`
      )

      const productData = {
        id: 'test-product-7',
        title: 'Test Product 7',
        pdf_file_id: 'test-file-id-7',
        page_count: 10,
        preview_pages: 3, // Limit to 3 pages
        file_uploads: {
          id: 'test-file-id-7',
          processing_status: 'completed',
          preview_urls: longUrlArray,
          thumbnail_urls: {},
          page_count: 10
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-7' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.preview_urls).toHaveLength(3)
      expect(responseData.preview_pages).toBe(3)
      expect(responseData.message).toContain('Showing preview of 3 pages out of 10 total pages')
    })

    test('should handle object format with missing sizes', async () => {
      const partialObjectFormat = {
        large: 'https://example.com/large.jpg',
        // medium missing
        small: 'https://example.com/small.jpg'
      }

      const productData = {
        id: 'test-product-8',
        title: 'Test Product 8',
        pdf_file_id: 'test-file-id-8',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id-8',
          processing_status: 'completed',
          preview_urls: partialObjectFormat,
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-8' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.preview_urls).toEqual([
        'https://example.com/large.jpg',
        'https://example.com/small.jpg'
      ])
      expect(responseData.preview_pages).toBe(2)
    })
  })

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockSupabaseResponse.data = null
      mockSupabaseResponse.error = { message: 'Database connection failed' }

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching product:',
        expect.objectContaining({ message: 'Database connection failed' })
      )
    })

    test('should handle unexpected errors', async () => {
      // Mock a function to throw an error
      mockSupabase.single.mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(500)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('Internal server error')
    })

    test('should handle malformed preview URLs gracefully', async () => {
      const productData = {
        id: 'test-product-malformed',
        title: 'Test Product Malformed',
        pdf_file_id: 'test-file-id',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id',
          processing_status: 'completed',
          preview_urls: 'not-an-array-or-object', // Invalid format
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-malformed' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.error).toBe('No preview images available for this PDF')
    })
  })

  describe('Security Tests', () => {
    test('should reject malicious URLs in preview_urls', async () => {
      const productData = {
        id: 'test-product-security',
        title: 'Test Product Security',
        pdf_file_id: 'test-file-id',
        page_count: 5,
        preview_pages: 3,
        file_uploads: {
          id: 'test-file-id',
          processing_status: 'completed',
          preview_urls: [
            'javascript:alert(1)',
            'data:text/html,<script>alert(1)</script>',
            'https://example.com/safe.jpg'
          ],
          thumbnail_urls: {},
          page_count: 5
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-security' }
      })

      await previewHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.preview_urls).toEqual(['https://example.com/safe.jpg'])
      expect(responseData.preview_pages).toBe(1)
    })

    test('should sanitize product ID parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: "'; DROP TABLE products; --" }
      })

      await previewHandler(req, res)

      // Should not cause any SQL injection issues
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', "'; DROP TABLE products; --")
    })
  })

  describe('Performance Tests', () => {
    test('should handle large preview URL arrays efficiently', async () => {
      const largeUrlArray = Array(100).fill().map((_, i) => 
        `https://example.com/preview${i + 1}.jpg`
      )

      const productData = {
        id: 'test-product-large',
        title: 'Test Product Large',
        pdf_file_id: 'test-file-id',
        page_count: 100,
        preview_pages: 10,
        file_uploads: {
          id: 'test-file-id',
          processing_status: 'completed',
          preview_urls: largeUrlArray,
          thumbnail_urls: {},
          page_count: 100
        }
      }

      mockSupabaseResponse.data = productData
      mockSupabaseResponse.error = null

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'test-product-large' }
      })

      const start = Date.now()
      await previewHandler(req, res)
      const end = Date.now()

      expect(res._getStatusCode()).toBe(200)
      expect(end - start).toBeLessThan(1000) // Should complete in under 1 second
      
      const responseData = JSON.parse(res._getData())
      expect(responseData.preview_urls).toHaveLength(10)
    })
  })
})