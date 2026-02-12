// Mock the config module with the actual value we want to test
import { requestTracing } from './request-tracing.js'
import { vi } from 'vitest'

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn().mockReturnValue('mock-tracing-header')
  }
}))

// Mock the hapi-tracing module
vi.mock('@defra/hapi-tracing', () => ({
  tracing: {
    plugin: {
      name: 'tracing',
      version: '1.0.0'
    }
  }
}))

describe('requestTracing', () => {
  it('should return config for tracing header', () => {
    expect(requestTracing.plugin).toEqual({
      name: 'tracing',
      version: '1.0.0'
    })
    expect(requestTracing.options).toEqual({
      tracingHeader: 'mock-tracing-header'
    })
  })
})
