import Hapi from '@hapi/hapi'
import { landDataIngest } from '../index.js'
import { processFile, createTaskInfo } from '../service/ingest.service.js'
import {
  logInfo,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { getFiles, filterFilesByDate } from '../../common/s3/s3.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { vi } from 'vitest'

vi.mock('../service/ingest.service.js')
vi.mock('~/src/features/common/helpers/logging/log-helpers.js')
vi.mock('../../common/s3/s3.js')
vi.mock('../../common/plugins/s3-client.js')

const mockProcessFile = processFile
const mockCreateTaskInfo = createTaskInfo
const mockLogInfo = logInfo
const mockLogBusinessError = logBusinessError
const mockGetFiles = getFiles
const mockFilterFilesByDate = filterFilesByDate
const mockCreateS3Client = createS3Client

describe('Ingest Controller', () => {
  const server = Hapi.server()
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockS3 = {
    send: vi.fn()
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
    vi.clearAllMocks()

    mockCreateTaskInfo.mockReturnValue({
      category: 'land_data_ingest',
      title: 'Land data ingest',
      taskId: 1729692000000,
      bucket: 'test-bucket'
    })
    mockProcessFile.mockResolvedValue(undefined)
    mockLogInfo.mockImplementation(vi.fn())
    mockLogBusinessError.mockImplementation(vi.fn())
    mockCreateS3Client.mockReturnValue(mockS3)
    mockGetFiles.mockResolvedValue([])
    mockFilterFilesByDate.mockReturnValue([])
  })

  describe('GET /ingest-land-data route', () => {
    it('should return 200 when new files are found', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      const mockFiles = [
        { Key: 'parcels/file1.csv' },
        { Key: 'parcels/file2.csv' }
      ]

      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockGetFiles.mockResolvedValue(mockFiles)
      mockFilterFilesByDate.mockReturnValue(mockFiles)
      mockProcessFile.mockResolvedValue(undefined)

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

      // Verify S3 functions were called
      expect(mockGetFiles).toHaveBeenCalledWith(mockS3, 'test-bucket')
      expect(mockFilterFilesByDate).toHaveBeenCalledWith(mockFiles, 5)

      // Verify processFile was called for each file
      expect(mockProcessFile).toHaveBeenCalledTimes(2)
      expect(mockProcessFile).toHaveBeenNthCalledWith(
        1,
        'parcels/file1.csv',
        expect.objectContaining({ logger: mockLogger }),
        'land_data_ingest',
        'Land data ingest',
        mockTaskInfo.taskId
      )
      expect(mockProcessFile).toHaveBeenNthCalledWith(
        2,
        'parcels/file2.csv',
        expect.objectContaining({ logger: mockLogger }),
        'land_data_ingest',
        'Land data ingest',
        mockTaskInfo.taskId
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
      mockGetFiles.mockResolvedValue([])
      mockFilterFilesByDate.mockReturnValue([])

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

      // Verify S3 functions were called
      expect(mockGetFiles).toHaveBeenCalledWith(mockS3, 'test-bucket')
      expect(mockFilterFilesByDate).toHaveBeenCalledWith([], 5)

      // Verify processFile was not called since no files
      expect(mockProcessFile).not.toHaveBeenCalled()

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

    it('should return 500 when getFiles fails', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      const mockError = new Error('S3 connection failed')
      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockGetFiles.mockRejectedValue(mockError)

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
      expect(mockGetFiles).toHaveBeenCalled()

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
