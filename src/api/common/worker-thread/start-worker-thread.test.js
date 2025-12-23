import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest'
import { Worker } from 'node:worker_threads'
import { startWorker } from './start-worker-thread.js'
import * as logHelpers from '../helpers/logging/log-helpers.js'

vi.mock('node:worker_threads')

describe('Start Worker Thread', () => {
  let mockRequest
  let mockWorker
  let mockLogger
  let messageHandler
  let errorHandler
  let exitHandler

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    mockRequest = {
      logger: mockLogger
    }

    mockWorker = {
      on: vi.fn((event, handler) => {
        if (event === 'message') messageHandler = handler
        if (event === 'error') errorHandler = handler
        if (event === 'exit') exitHandler = handler
      })
    }

    Worker.mockImplementation(() => mockWorker)

    vi.spyOn(logHelpers, 'logInfo')
    vi.spyOn(logHelpers, 'logBusinessError')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Start worker thread', () => {
    it('should handle a complete successful worker lifecycle', async () => {
      const workerPath = '/path/to/worker.js'
      const taskId = 999
      const data = [{ id: 1 }, { id: 2 }]

      const workerPromise = startWorker(
        mockRequest,
        workerPath,
        'Data Processor',
        'data_processing',
        taskId,
        data
      )

      messageHandler({ success: true, processed: 2 })
      expect(logHelpers.logInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'data_processing',
        operation: 'data_processing_completed',
        message: 'Data Processor completed successfully',
        context: { result: true, file: data }
      })

      exitHandler(0)
      await workerPromise

      expect(logHelpers.logInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'data_processing',
        operation: 'data_processing_exit',
        message: 'Data Processor exited successfully',
        context: { taskId, code: 0, file: data }
      })

      expect(logHelpers.logBusinessError).not.toHaveBeenCalled()
    })

    it('should handle a worker that completes with errors', async () => {
      const taskId = 888

      const workerPromise = startWorker(
        mockRequest,
        '/path/to/worker.js',
        'Error Prone Worker',
        'error_category',
        taskId,
        []
      )

      messageHandler({ success: false, errors: ['Error 1'] })
      expect(logHelpers.logInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'error_category',
        operation: 'error_category_completed',
        message: 'Error Prone Worker completed with errors',
        context: { result: false, file: [] }
      })

      exitHandler(1)

      await expect(workerPromise).rejects.toThrow(
        'Error Prone Worker stopped with exit code 1'
      )

      expect(logHelpers.logBusinessError).toHaveBeenCalledWith(mockLogger, {
        operation: 'error_category_exit',
        error: new Error('Error Prone Worker stopped with exit code 1'),
        context: { taskId, code: 1, file: [] }
      })
    })

    it('should handle a worker that throws an error during execution', async () => {
      const taskId = 777

      const workerPromise = startWorker(
        mockRequest,
        '/path/to/worker.js',
        'Crashing Worker',
        'crash_category',
        taskId,
        []
      )

      const error = new Error('Unexpected crash')
      errorHandler(error)

      await expect(workerPromise).rejects.toThrow('Unexpected crash')

      expect(logHelpers.logBusinessError).toHaveBeenCalledWith(mockLogger, {
        operation: 'crash_category_error',
        error,
        context: { taskId, file: [] }
      })
    })
  })
})
