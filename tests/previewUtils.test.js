/**
 * Comprehensive test suite for preview URL utilities
 * Tests both legacy array format and new object format handling
 */

import {
  normalizePreviewUrls,
  getFirstPreviewUrl,
  hasValidPreviewUrls,
  getPreviewUrlForPage,
  getPreviewUrlCount,
  convertObjectToArrayFormat,
  debugPreviewUrls
} from '../utils/previewUtils.js'

describe('previewUtils', () => {
  // Mock console for tests that use logging
  beforeEach(() => {
    global.mockConsole()
  })

  describe('normalizePreviewUrls', () => {
    describe('Legacy Array Format', () => {
      test('should handle valid array of URLs', () => {
        const input = testFixtures.legacyArrayFormat
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual(input)
        expect(result).toHaveLength(3)
      })

      test('should filter out invalid URLs from array', () => {
        const input = testFixtures.mixedValidInvalid
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual([
          'https://example.com/valid1.jpg',
          'https://example.com/valid2.jpg', 
          'https://example.com/valid3.jpg'
        ])
        expect(result).toHaveLength(3)
      })

      test('should handle empty array', () => {
        const result = normalizePreviewUrls([])
        expect(result).toEqual([])
      })

      test('should filter out malicious URLs', () => {
        const result = normalizePreviewUrls(testFixtures.maliciousUrls)
        expect(result).toEqual([])
      })

      test('should handle array with only whitespace strings', () => {
        const input = ['  ', '\t', '\n', '   ']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })
    })

    describe('New Object Format', () => {
      test('should handle valid object format', () => {
        const input = testFixtures.objectFormat
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual([
          'https://example.com/large-preview.jpg',
          'https://example.com/medium-preview.jpg',
          'https://example.com/small-preview.jpg'
        ])
        expect(result).toHaveLength(3)
      })

      test('should prioritize large over medium over small', () => {
        const input = {
          small: 'https://example.com/small.jpg',
          large: 'https://example.com/large.jpg',
          medium: 'https://example.com/medium.jpg'
        }
        const result = normalizePreviewUrls(input)
        
        expect(result[0]).toBe('https://example.com/large.jpg')
        expect(result[1]).toBe('https://example.com/medium.jpg')
        expect(result[2]).toBe('https://example.com/small.jpg')
      })

      test('should handle partial object (missing sizes)', () => {
        const input = {
          large: 'https://example.com/large.jpg',
          small: 'https://example.com/small.jpg'
          // medium is missing
        }
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual([
          'https://example.com/large.jpg',
          'https://example.com/small.jpg'
        ])
        expect(result).toHaveLength(2)
      })

      test('should filter out invalid URLs in object format', () => {
        const input = {
          large: 'https://example.com/large.jpg',
          medium: 'invalid-url',
          small: 'javascript:alert(1)'
        }
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual(['https://example.com/large.jpg'])
        expect(result).toHaveLength(1)
      })

      test('should handle object with extra properties', () => {
        const input = {
          large: 'https://example.com/large.jpg',
          medium: 'https://example.com/medium.jpg',
          small: 'https://example.com/small.jpg',
          extraProperty: 'https://example.com/extra.jpg',
          anotherProperty: 'some-value'
        }
        const result = normalizePreviewUrls(input)
        
        expect(result).toEqual([
          'https://example.com/large.jpg',
          'https://example.com/medium.jpg',
          'https://example.com/small.jpg'
        ])
        expect(result).toHaveLength(3)
      })

      test('should handle empty object', () => {
        const result = normalizePreviewUrls({})
        expect(result).toEqual([])
      })
    })

    describe('Edge Cases and Invalid Input', () => {
      test('should handle null input', () => {
        const result = normalizePreviewUrls(null)
        expect(result).toEqual([])
      })

      test('should handle undefined input', () => {
        const result = normalizePreviewUrls(undefined)
        expect(result).toEqual([])
      })

      test('should handle string input', () => {
        const result = normalizePreviewUrls('not-an-array-or-object')
        expect(result).toEqual([])
        expect(console.warn).toHaveBeenCalledWith(
          '[previewUtils] Unexpected preview_urls type:', 
          'string'
        )
      })

      test('should handle number input', () => {
        const result = normalizePreviewUrls(123)
        expect(result).toEqual([])
        expect(console.warn).toHaveBeenCalledWith(
          '[previewUtils] Unexpected preview_urls type:', 
          'number'
        )
      })

      test('should handle boolean input', () => {
        const result = normalizePreviewUrls(true)
        expect(result).toEqual([])
        expect(console.warn).toHaveBeenCalledWith(
          '[previewUtils] Unexpected preview_urls type:', 
          'boolean'
        )
      })
    })

    describe('URL Validation Security', () => {
      test('should reject javascript: URLs', () => {
        const input = ['javascript:alert(1)']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })

      test('should reject data: URLs', () => {
        const input = ['data:text/html,<script>alert(1)</script>']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })

      test('should reject file: URLs', () => {
        const input = ['file:///etc/passwd']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })

      test('should reject ftp: URLs', () => {
        const input = ['ftp://example.com/file.jpg']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })

      test('should accept https: URLs', () => {
        const input = ['https://example.com/image.jpg']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual(input)
      })

      test('should accept http: URLs', () => {
        const input = ['http://example.com/image.jpg']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual(input)
      })

      test('should handle malformed URLs gracefully', () => {
        const input = ['not-a-url', 'http://', 'https://']
        const result = normalizePreviewUrls(input)
        expect(result).toEqual([])
      })
    })
  })

  describe('getFirstPreviewUrl', () => {
    test('should return first URL from array format', () => {
      const input = testFixtures.legacyArrayFormat
      const result = getFirstPreviewUrl(input)
      expect(result).toBe('https://example.com/preview1.jpg')
    })

    test('should return large URL from object format', () => {
      const input = testFixtures.objectFormat
      const result = getFirstPreviewUrl(input)
      expect(result).toBe('https://example.com/large-preview.jpg')
    })

    test('should return null for empty input', () => {
      expect(getFirstPreviewUrl([])).toBeNull()
      expect(getFirstPreviewUrl({})).toBeNull()
      expect(getFirstPreviewUrl(null)).toBeNull()
      expect(getFirstPreviewUrl(undefined)).toBeNull()
    })

    test('should return null when all URLs are invalid', () => {
      const result = getFirstPreviewUrl(testFixtures.maliciousUrls)
      expect(result).toBeNull()
    })

    test('should return first valid URL when mixed valid/invalid', () => {
      const result = getFirstPreviewUrl(testFixtures.mixedValidInvalid)
      expect(result).toBe('https://example.com/valid1.jpg')
    })
  })

  describe('hasValidPreviewUrls', () => {
    test('should return true for valid array format', () => {
      const result = hasValidPreviewUrls(testFixtures.legacyArrayFormat)
      expect(result).toBe(true)
    })

    test('should return true for valid object format', () => {
      const result = hasValidPreviewUrls(testFixtures.objectFormat)
      expect(result).toBe(true)
    })

    test('should return false for empty inputs', () => {
      expect(hasValidPreviewUrls([])).toBe(false)
      expect(hasValidPreviewUrls({})).toBe(false)
      expect(hasValidPreviewUrls(null)).toBe(false)
      expect(hasValidPreviewUrls(undefined)).toBe(false)
    })

    test('should return false when all URLs are invalid', () => {
      const result = hasValidPreviewUrls(testFixtures.maliciousUrls)
      expect(result).toBe(false)
    })

    test('should return true when at least one URL is valid', () => {
      const result = hasValidPreviewUrls(testFixtures.mixedValidInvalid)
      expect(result).toBe(true)
    })
  })

  describe('getPreviewUrlForPage', () => {
    test('should return correct URL for valid page number (array format)', () => {
      const input = testFixtures.legacyArrayFormat
      expect(getPreviewUrlForPage(input, 1)).toBe('https://example.com/preview1.jpg')
      expect(getPreviewUrlForPage(input, 2)).toBe('https://example.com/preview2.jpg')
      expect(getPreviewUrlForPage(input, 3)).toBe('https://example.com/preview3.jpg')
    })

    test('should return correct URL for valid page number (object format)', () => {
      const input = testFixtures.objectFormat
      expect(getPreviewUrlForPage(input, 1)).toBe('https://example.com/large-preview.jpg')
      expect(getPreviewUrlForPage(input, 2)).toBe('https://example.com/medium-preview.jpg')
      expect(getPreviewUrlForPage(input, 3)).toBe('https://example.com/small-preview.jpg')
    })

    test('should return null for invalid page numbers', () => {
      const input = testFixtures.legacyArrayFormat
      expect(getPreviewUrlForPage(input, 0)).toBeNull()
      expect(getPreviewUrlForPage(input, -1)).toBeNull()
      expect(getPreviewUrlForPage(input, 4)).toBeNull()
      expect(getPreviewUrlForPage(input, 100)).toBeNull()
    })

    test('should return null for empty inputs', () => {
      expect(getPreviewUrlForPage([], 1)).toBeNull()
      expect(getPreviewUrlForPage({}, 1)).toBeNull()
      expect(getPreviewUrlForPage(null, 1)).toBeNull()
      expect(getPreviewUrlForPage(undefined, 1)).toBeNull()
    })

    test('should handle edge case page numbers', () => {
      const input = testFixtures.legacyArrayFormat
      expect(getPreviewUrlForPage(input, 1.5)).toBeNull() // Non-integer
      expect(getPreviewUrlForPage(input, '2')).toBeNull() // String input
    })
  })

  describe('getPreviewUrlCount', () => {
    test('should return correct count for array format', () => {
      const result = getPreviewUrlCount(testFixtures.legacyArrayFormat)
      expect(result).toBe(3)
    })

    test('should return correct count for object format', () => {
      const result = getPreviewUrlCount(testFixtures.objectFormat)
      expect(result).toBe(3)
    })

    test('should return 0 for empty inputs', () => {
      expect(getPreviewUrlCount([])).toBe(0)
      expect(getPreviewUrlCount({})).toBe(0)
      expect(getPreviewUrlCount(null)).toBe(0)
      expect(getPreviewUrlCount(undefined)).toBe(0)
    })

    test('should return count only for valid URLs', () => {
      const result = getPreviewUrlCount(testFixtures.mixedValidInvalid)
      expect(result).toBe(3) // Only valid URLs counted
    })

    test('should return 0 when all URLs are invalid', () => {
      const result = getPreviewUrlCount(testFixtures.maliciousUrls)
      expect(result).toBe(0)
    })
  })

  describe('convertObjectToArrayFormat', () => {
    test('should convert object format to array format', () => {
      const input = testFixtures.objectFormat
      const result = convertObjectToArrayFormat(input)
      
      expect(result).toEqual([
        'https://example.com/large-preview.jpg',
        'https://example.com/medium-preview.jpg',
        'https://example.com/small-preview.jpg'
      ])
    })

    test('should handle partial object', () => {
      const input = {
        large: 'https://example.com/large.jpg',
        small: 'https://example.com/small.jpg'
        // medium missing
      }
      const result = convertObjectToArrayFormat(input)
      
      expect(result).toEqual([
        'https://example.com/large.jpg',
        'https://example.com/small.jpg'
      ])
    })

    test('should filter out invalid URLs', () => {
      const input = {
        large: 'https://example.com/large.jpg',
        medium: 'invalid-url',
        small: ''
      }
      const result = convertObjectToArrayFormat(input)
      
      expect(result).toEqual(['https://example.com/large.jpg'])
    })

    test('should return empty array for invalid inputs', () => {
      expect(convertObjectToArrayFormat(null)).toEqual([])
      expect(convertObjectToArrayFormat(undefined)).toEqual([])
      expect(convertObjectToArrayFormat('not-an-object')).toEqual([])
      expect(convertObjectToArrayFormat(123)).toEqual([])
    })

    test('should return empty array for empty object', () => {
      const result = convertObjectToArrayFormat({})
      expect(result).toEqual([])
    })
  })

  describe('debugPreviewUrls', () => {
    test('should log debug information in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const input = testFixtures.legacyArrayFormat
      debugPreviewUrls(input, 'test-context')
      
      expect(console.log).toHaveBeenCalledWith(
        '[previewUtils] test-context - Preview URLs debug:',
        expect.objectContaining({
          type: 'object',
          isArray: true,
          value: input,
          normalized: input
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })

    test('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const input = testFixtures.legacyArrayFormat
      debugPreviewUrls(input, 'test-context')
      
      expect(console.log).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    test('should handle debug with object format', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const input = testFixtures.objectFormat
      debugPreviewUrls(input)
      
      expect(console.log).toHaveBeenCalledWith(
        '[previewUtils] unknown - Preview URLs debug:',
        expect.objectContaining({
          type: 'object',
          isArray: false,
          value: input
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Backward Compatibility', () => {
    test('should handle legacy data mixed with new data', () => {
      // Test that functions work consistently regardless of format
      const legacyData = testFixtures.legacyArrayFormat
      const newData = testFixtures.objectFormat
      
      expect(hasValidPreviewUrls(legacyData)).toBe(true)
      expect(hasValidPreviewUrls(newData)).toBe(true)
      
      expect(getPreviewUrlCount(legacyData)).toBe(3)
      expect(getPreviewUrlCount(newData)).toBe(3)
      
      expect(getFirstPreviewUrl(legacyData)).toBeTruthy()
      expect(getFirstPreviewUrl(newData)).toBeTruthy()
    })

    test('should normalize both formats to same structure when URLs are equivalent', () => {
      const legacyFormat = [
        'https://example.com/page1.jpg',
        'https://example.com/page2.jpg',
        'https://example.com/page3.jpg'
      ]
      
      const objectFormat = {
        large: 'https://example.com/page1.jpg',
        medium: 'https://example.com/page2.jpg',
        small: 'https://example.com/page3.jpg'
      }
      
      const normalizedLegacy = normalizePreviewUrls(legacyFormat)
      const normalizedObject = normalizePreviewUrls(objectFormat)
      
      expect(normalizedLegacy).toEqual(normalizedObject)
    })
  })

  describe('Race Condition Prevention', () => {
    test('should handle concurrent calls to normalizePreviewUrls', async () => {
      const input = testFixtures.legacyArrayFormat
      
      // Simulate concurrent calls
      const promises = Array(10).fill().map(() => 
        Promise.resolve(normalizePreviewUrls(input))
      )
      
      const results = await Promise.all(promises)
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(input)
      })
    })

    test('should handle rapid sequential calls', () => {
      const input1 = testFixtures.legacyArrayFormat
      const input2 = testFixtures.objectFormat
      
      const results = []
      for (let i = 0; i < 100; i++) {
        const input = i % 2 === 0 ? input1 : input2
        results.push(normalizePreviewUrls(input))
      }
      
      // Each result should be correct for its input
      results.forEach((result, index) => {
        const expectedInput = index % 2 === 0 ? input1 : input2
        const expected = normalizePreviewUrls(expectedInput)
        expect(result).toEqual(expected)
      })
    })
  })

  describe('Memory and Performance', () => {
    test('should handle large arrays efficiently', () => {
      const largeArray = Array(1000).fill().map((_, i) => 
        `https://example.com/preview${i}.jpg`
      )
      
      const start = Date.now()
      const result = normalizePreviewUrls(largeArray)
      const end = Date.now()
      
      expect(result).toHaveLength(1000)
      expect(end - start).toBeLessThan(100) // Should complete in under 100ms
    })

    test('should not mutate input data', () => {
      const input = [...testFixtures.legacyArrayFormat]
      const originalInput = [...input]
      
      normalizePreviewUrls(input)
      
      expect(input).toEqual(originalInput)
    })

    test('should not mutate object input', () => {
      const input = { ...testFixtures.objectFormat }
      const originalInput = { ...input }
      
      normalizePreviewUrls(input)
      
      expect(input).toEqual(originalInput)
    })
  })
})