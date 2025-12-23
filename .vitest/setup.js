import { vi, beforeEach, afterEach } from 'vitest'
import { fetch } from 'undici'

// Store original fetch
const originalFetch = fetch

// Create fetchMock object compatible with jest-fetch-mock API
const fetchMock = {
  enableMocks: () => {
    // Create a mock fetch function
    const mockFetch = vi.fn()
    // Add mockResponse method for compatibility
    mockFetch.mockResponse = (fn) => {
      mockFetch.mockImplementation(async (...args) => {
        const response = await fn(...args)
        if (response && typeof response === 'object' && 'ok' in response) {
          return response
        }
        return {
          ok: true,
          status: 200,
          json: async () => response,
          text: async () => JSON.stringify(response),
          ...response
        }
      })
    }
    // Default implementation that returns a successful response
    mockFetch.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}'
    }))
    global.fetch = mockFetch
  },
  disableMocks: () => {
    global.fetch = originalFetch
  },
  mockResponse: (fn) => {
    if (typeof global.fetch === 'function' && 'mockResponse' in global.fetch) {
      global.fetch.mockResponse(fn)
    }
  }
}

// Set up default fetch
global.fetch = originalFetch

// Make fetchMock available globally for tests that use it
global.fetchMock = fetchMock

// Jest compatibility: make jest available as an alias to vi for easier migration
// Vitest provides globals, but we add jest for compatibility
if (typeof global.jest === 'undefined') {
  global.jest = {
    fn: vi.fn,
    spyOn: vi.spyOn,
    mock: vi.mock,
    clearAllMocks: vi.clearAllMocks,
    resetAllMocks: vi.resetAllMocks,
    restoreAllMocks: vi.restoreAllMocks
  }
}

// Export for module imports
export default fetchMock
