import Hapi from '@hapi/hapi'
import { landDataIngest } from '../index.js'
import {
  fileProcessor,
  createTaskInfo
} from '../service/ingest-schedule.service.js'
import {
  logInfo,
  logBusinessError
} from '~/src/api/common/helpers/logging/log-helpers.js'

jest.mock('../service/ingest-schedule.service.js')
jest.mock('~/src/api/common/helpers/logging/log-helpers.js')

const mockFileProcessor = fileProcessor
const mockCreateTaskInfo = createTaskInfo
const mockLogInfo = logInfo
const mockLogBusinessError = logBusinessError

describe('Ingest Schedule Controller', () => {
  const server = Hapi.server()
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  const mockS3 = {
    send: jest.fn()
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 's3', mockS3)

    await server.register([landDataIngest])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockCreateTaskInfo.mockReturnValue({
      category: 'land_data_ingest',
      title: 'Land data ingest',
      taskId: 1729692000000,
      bucket: 'test-bucket'
    })
    mockFileProcessor.mockResolvedValue(true)
    mockLogInfo.mockImplementation(jest.fn())
    mockLogBusinessError.mockImplementation(jest.fn())
  })

  describe('GET /ingest-land-data-schedule route', () => {
    it('should return 200 when new files are found', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockFileProcessor.mockResolvedValue(true)

      const request = {
        method: 'GET',
        url: '/ingest-land-data-schedule'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, taskId }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Land data ingest started')
      expect(taskId).toBe(mockTaskInfo.taskId)

      // Verify createTaskInfo was called correctly
      expect(mockCreateTaskInfo).toHaveBeenCalledWith(
        expect.any(Number),
        'land_data_ingest'
      )

      // Verify fileProcessor was called with correct parameters
      expect(mockFileProcessor).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: mockLogger
        }),
        'land_data_ingest',
        'Land data ingest',
        mockTaskInfo.taskId,
        'test-bucket'
      )

      // Verify logging was called correctly
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land_data_ingest',
        operation: 'land_data_ingest_start',
        message: 'Starting Land data ingest',
        context: { taskId: mockTaskInfo.taskId }
      })

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land_data_ingest',
        operation: 'land_data_ingest_new_files',
        message: 'New files found in test-bucket bucket',
        context: { bucket: 'test-bucket', taskId: mockTaskInfo.taskId }
      })
    })

    it('should return 200 when no files are found', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockFileProcessor.mockResolvedValue(false)

      const request = {
        method: 'GET',
        url: '/ingest-land-data-schedule'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, taskId }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('No new files found in test-bucket bucket')
      expect(taskId).toBe(mockTaskInfo.taskId)

      // Verify createTaskInfo was called correctly
      expect(mockCreateTaskInfo).toHaveBeenCalledWith(
        expect.any(Number),
        'land_data_ingest'
      )

      // Verify fileProcessor was called
      expect(mockFileProcessor).toHaveBeenCalledWith(
        expect.objectContaining({
          logger: mockLogger
        }),
        'land_data_ingest',
        'Land data ingest',
        mockTaskInfo.taskId,
        'test-bucket'
      )

      // Verify logging was called correctly
      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land_data_ingest',
        operation: 'land_data_ingest_start',
        message: 'Starting Land data ingest',
        context: { taskId: mockTaskInfo.taskId }
      })

      expect(mockLogInfo).toHaveBeenCalledWith(mockLogger, {
        category: 'land_data_ingest',
        operation: 'land_data_ingest_no_new_files',
        message: 'No new files found in test-bucket bucket',
        context: { bucket: 'test-bucket', taskId: mockTaskInfo.taskId }
      })
    })

    it('should return 500 when fileProcessor fails', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      const mockError = new Error('S3 connection failed')
      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockFileProcessor.mockRejectedValue(mockError)

      const request = {
        method: 'GET',
        url: '/ingest-land-data-schedule'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')

      expect(mockCreateTaskInfo).toHaveBeenCalled()
      expect(mockFileProcessor).toHaveBeenCalled()

      // Verify that logBusinessError was called in the catch block
      expect(mockLogBusinessError).toHaveBeenCalledWith(mockLogger, {
        operation: 'land_data_ingest_error',
        error: mockError,
        context: {
          taskId: mockTaskInfo.taskId
        }
      })
    })
  })
})
