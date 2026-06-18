import { vi } from 'vitest'
import { config } from '~/src/config/index.js'
import { router } from '~/src/routes/router.js'
import { parcel } from '~/src/features/parcel/index.js'
import { payments } from '~/src/features/payment/index.js'
import { application } from '~/src/features/application/index.js'
import { caseManagementAdapter } from '~/src/features/case-management-adapter/index.js'
import { landDataIngest } from '~/src/features/land-data-ingest/index.js'
import { testEndpoints } from '~/src/features/test-endpoints/index.js'

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn()
  }
}))

const mockConfig = vi.mocked(config)

describe('router', () => {
  describe('when testEndpoints feature flag is enabled', () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue(true)
    })

    test('should register all controllers including test endpoints', async () => {
      const mockRegister = vi.fn()
      const mockLogger = {
        warn: vi.fn()
      }

      const mockServer = {
        register: mockRegister,
        logger: mockLogger
      }

      await router.plugin.register(mockServer)

      // Verify all controllers were registered
      expect(mockRegister).toHaveBeenCalledTimes(6)
      expect(mockRegister).toHaveBeenNthCalledWith(1, [parcel])
      expect(mockRegister).toHaveBeenNthCalledWith(2, [payments])
      expect(mockRegister).toHaveBeenNthCalledWith(3, [application])
      expect(mockRegister).toHaveBeenNthCalledWith(4, [caseManagementAdapter])
      expect(mockRegister).toHaveBeenNthCalledWith(5, [landDataIngest])
      expect(mockRegister).toHaveBeenNthCalledWith(6, [testEndpoints])

      // Verify logger warning was called
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Test endpoints are enabled. These should not be used in production.'
      )
    })
  })

  describe('when testEndpoints feature flag is disabled', () => {
    beforeEach(() => {
      mockConfig.get.mockReturnValue(false)
    })

    test('should register all controllers except test endpoints', async () => {
      const mockRegister = vi.fn()
      const mockLogger = {
        warn: vi.fn()
      }

      const mockServer = {
        register: mockRegister,
        logger: mockLogger
      }

      await router.plugin.register(mockServer)

      // Verify all controllers except testEndpoints were registered
      expect(mockRegister).toHaveBeenCalledTimes(5)
      expect(mockRegister).toHaveBeenNthCalledWith(1, [parcel])
      expect(mockRegister).toHaveBeenNthCalledWith(2, [payments])
      expect(mockRegister).toHaveBeenNthCalledWith(3, [application])
      expect(mockRegister).toHaveBeenNthCalledWith(4, [caseManagementAdapter])
      expect(mockRegister).toHaveBeenNthCalledWith(5, [landDataIngest])

      // Verify testEndpoints was not registered
      expect(mockRegister).not.toHaveBeenCalledWith([testEndpoints])

      // Verify logger warning was not called
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})
