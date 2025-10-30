import { pulse } from '~/src/api/common/helpers/pulse.js'

jest.mock('hapi-pulse', () => 'mock-hapi-pulse')
jest.mock('~/src/api/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
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
