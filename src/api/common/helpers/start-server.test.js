import { startServer } from '~/src/api/common/helpers/start-server.js'
import { createServer } from '~/src/api/index.js'
import { createLogger } from '~/src/api/common/helpers/logging/logger.js'

// Mock all external dependencies
jest.mock('~/src/config/index.js', () => ({
  config: {
    get: jest.fn().mockReturnValue(3000)
  }
}))

jest.mock('~/src/api/index.js', () => ({
  createServer: jest.fn()
}))

jest.mock('~/src/api/common/helpers/logging/logger.js', () => ({
  createLogger: jest.fn()
}))

describe('startServer', () => {
  // Mock server and logger objects
  const mockServer = {
    start: jest.fn().mockResolvedValue(),
    logger: {
      info: jest.fn(),
      error: jest.fn()
    }
  }

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    createServer.mockResolvedValue(mockServer)
    createLogger.mockReturnValue(mockLogger)
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
