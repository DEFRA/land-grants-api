import { pulse } from '~/src/features/common/helpers/pulse.js'
import { vi } from 'vitest'

vi.mock('hapi-pulse', () => ({
  default: 'mock-hapi-pulse'
}))
vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }))
}))

describe('#pulse', () => {
  test('Should have the correct plugin', () => {
    expect(pulse.plugin).toBe('mock-hapi-pulse')
  })

  test('Should have the correct options structure', () => {
    expect(pulse.options).toBeDefined()
    expect(pulse.options.logger).toBeDefined()
    expect(pulse.options.timeout).toBeDefined()
  })

  test('Should configure logger option', () => {
    expect(pulse.options.logger).toHaveProperty('info')
    expect(pulse.options.logger).toHaveProperty('error')
    expect(pulse.options.logger).toHaveProperty('warn')
    expect(pulse.options.logger).toHaveProperty('debug')
  })

  test('Should configure timeout to 10 seconds (10000ms)', () => {
    expect(pulse.options.timeout).toBe(10000)
  })
})
