import { vi } from 'vitest'
import { config } from '~/src/config/index.js'
import { router } from '~/src/routes/router.js'
import { parcel } from '~/src/features/parcel/index.js'
import { payments } from '~/src/features/payment/index.js'
import { application } from '~/src/features/application/index.js'
import { caseManagementAdapter } from '~/src/features/case-management-adapter/index.js'
import { landDataIngest } from '~/src/features/land-data-ingest/index.js'

// `log` must resolve to a valid shape here (not just in beforeEach): several
// registered plugins transitively import the pino logger at module-load
// time (e.g. via audit-event.js), which reads config.get('log') immediately,
// before any test hook runs.
vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn((key) =>
      key === 'log'
        ? { enabled: false, level: 'silent', format: 'pino-pretty', redact: [] }
        : false
    )
  }
}))

const mockConfig = vi.mocked(config)

describe('router', () => {
  beforeEach(() => {
    mockConfig.get.mockReturnValue(false)
  })

  test('should register all controllers', async () => {
    const mockRegister = vi.fn()
    const mockLogger = {
      warn: vi.fn()
    }

    const mockServer = {
      register: mockRegister,
      logger: mockLogger
    }

    await router.plugin.register(mockServer)

    expect(mockRegister).toHaveBeenCalledTimes(5)
    expect(mockRegister).toHaveBeenNthCalledWith(1, [parcel])
    expect(mockRegister).toHaveBeenNthCalledWith(2, [payments])
    expect(mockRegister).toHaveBeenNthCalledWith(3, [application])
    expect(mockRegister).toHaveBeenNthCalledWith(4, [caseManagementAdapter])
    expect(mockRegister).toHaveBeenNthCalledWith(5, [landDataIngest])

    // Verify logger warning was not called
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})
