import { startServer } from '~/src/features/common/helpers/start-server.js'
import { createServer } from '~/src/routes/index.js'
import { createLogger } from '~/src/features/common/helpers/logging/logger.js'
import { vi } from 'vitest'

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'port') {
        return 3000
      }
      return undefined
    })
  }
}))

vi.mock('~/src/routes/index.js', () => ({
  createServer: vi.fn()
}))

vi.mock('~/src/features/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn()
}))

describe('startServer', () => {
  let mockServer
  let mockLogger

  beforeEach(() => {
    mockServer = {
      start: vi.fn().mockResolvedValue(),
      logger: {
        info: vi.fn(),
        error: vi.fn()
      }
    }
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
    createServer.mockResolvedValue(mockServer)
    createLogger.mockReturnValue(mockLogger)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('successfully starts the server', async () => {
    const server = await startServer()

    expect(createServer).toHaveBeenCalledTimes(1)
    expect(mockServer.start).toHaveBeenCalledTimes(1)
    expect(mockServer.logger.info).toHaveBeenCalledWith(
      'Server started successfully'
    )
    expect(mockServer.logger.info).toHaveBeenCalledWith(
      'Access your backend on http://localhost:3000'
    )
    expect(server).toBe(mockServer)
  })

  test('handles server creation error', async () => {
    const testError = new Error('Server creation failed')
    createServer.mockRejectedValueOnce(testError)

    const server = await startServer()

    expect(createServer).toHaveBeenCalledTimes(1)
    expect(createLogger).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith('Server failed to start :(')
    expect(mockLogger.error).toHaveBeenCalledWith(testError)
    expect(server).toBeUndefined()
  })

  test('handles server start error', async () => {
    const testError = new Error('Server start failed')
    mockServer.start.mockRejectedValueOnce(testError)

    const server = await startServer()

    expect(createServer).toHaveBeenCalledTimes(1)
    expect(mockServer.start).toHaveBeenCalledTimes(1)
    expect(createLogger).toHaveBeenCalledTimes(1)
    expect(mockLogger.info).toHaveBeenCalledWith('Server failed to start :(')
    expect(mockLogger.error).toHaveBeenCalledWith(testError)
    expect(server).toBe(mockServer)
  })
})
