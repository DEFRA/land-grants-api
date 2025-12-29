import hapi from '@hapi/hapi'
import { vi } from 'vitest'

import { secureContext } from '~/src/api/common/helpers/secure-context/index.js'
import { requestLogger } from '~/src/api/common/helpers/logging/request-logger.js'
import { config } from '~/src/config/index.js'

vi.mock('hapi-pino', () => ({
  default: {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: vi.fn(),
        error: vi.fn()
      })
    },
    name: 'mock-hapi-pino'
  }
}))
vi.mock('node:tls', async () => {
  const actual = await vi.importActual('node:tls')
  const mockAddCACertFn = vi.fn()
  const mockTlsCreateSecureContextFn = vi.fn(() => {
    return { context: { addCACert: mockAddCACertFn } }
  })

  // Store references globally so tests can access them
  global.mockTlsCreateSecureContext = mockTlsCreateSecureContextFn
  global.mockAddCACert = mockAddCACertFn

  return {
    default: {
      ...actual.default,
      createSecureContext: mockTlsCreateSecureContextFn
    }
  }
})

describe('#secureContext', () => {
  let server

  describe('When secure context is disabled', () => {
    beforeEach(async () => {
      config.set('isSecureContextEnabled', false)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    test('secureContext decorator should not be available', () => {
      expect(server.logger.info).toHaveBeenCalledWith(
        'Custom secure context is disabled'
      )
    })

    test('Logger should give us disabled message', () => {
      expect(server.secureContext).toBeUndefined()
    })
  })

  describe('When secure context is enabled', () => {
    const PROCESS_ENV = process.env

    beforeAll(() => {
      process.env = { ...PROCESS_ENV }
      process.env.TRUSTSTORE_ONE = 'mock-trust-store-cert-one'
    })

    beforeEach(async () => {
      config.set('isSecureContextEnabled', true)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    afterAll(() => {
      process.env = PROCESS_ENV
    })

    test('Original tls.createSecureContext should have been called', () => {
      expect(global.mockTlsCreateSecureContext).toHaveBeenCalledWith({})
    })

    test('addCACert should have been called', () => {
      expect(global.mockAddCACert).toHaveBeenCalled()
    })

    test('secureContext decorator should be available', () => {
      expect(server.secureContext).toEqual({
        context: { addCACert: expect.any(Function) }
      })
    })
  })

  describe('When secure context is enabled without TRUSTSTORE_ certs', () => {
    beforeEach(async () => {
      config.set('isSecureContextEnabled', true)
      server = hapi.server()
      await server.register([requestLogger, secureContext])
    })

    afterEach(async () => {
      config.set('isSecureContextEnabled', false)
      await server.stop({ timeout: 0 })
    })

    test('Should log about not finding any TRUSTSTORE_ certs', () => {
      expect(server.logger.info).toHaveBeenCalledWith(
        'Could not find any TRUSTSTORE_ certificates'
      )
    })
  })
})
