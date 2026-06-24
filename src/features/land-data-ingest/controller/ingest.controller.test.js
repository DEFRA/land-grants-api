import Hapi from '@hapi/hapi'
import { landDataIngest } from '../index.js'
import { processFile, createTaskInfo } from '../service/ingest.service.js'
import {
  logInfo,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { getFiles, filterFilesByDate } from '../../common/s3/s3.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { filterFilesByEntityType } from './ingest.controller.js'
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
        { Key: 'land_parcels/file1.csv' },
        { Key: 'land_covers/file2.csv' }
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
        { s3key: 'land_parcels/file1.csv' },
        expect.objectContaining({ logger: mockLogger }),
        {
          category: 'land_data_ingest',
          title: 'Land data ingest',
          taskId: mockTaskInfo.taskId
        }
      )
      expect(mockProcessFile).toHaveBeenNthCalledWith(
        2,
        { s3key: 'land_covers/file2.csv' },
        expect.objectContaining({ logger: mockLogger }),
        {
          category: 'land_data_ingest',
          title: 'Land data ingest',
          taskId: mockTaskInfo.taskId
        }
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

    it('should filter out files that do not belong to ingest entity types', async () => {
      const mockTaskInfo = {
        category: 'land_data_ingest',
        title: 'Land data ingest',
        taskId: 1729692000000,
        bucket: 'test-bucket'
      }

      const allFiles = [
        { Key: 'land_parcels/file1.csv' },
        { Key: 'land_covers/file2.csv' },
        { Key: 'moorland_designations/file3.csv' },
        { Key: 'sssi/file4.csv' }
      ]

      mockCreateTaskInfo.mockReturnValue(mockTaskInfo)
      mockGetFiles.mockResolvedValue(allFiles)
      mockFilterFilesByDate.mockReturnValue(allFiles)
      mockProcessFile.mockResolvedValue(undefined)

      const request = {
        method: 'GET',
        url: '/ingest-land-data-schedule'
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(mockProcessFile).toHaveBeenCalledTimes(2)
      expect(mockProcessFile).toHaveBeenCalledWith(
        { s3key: 'land_parcels/file1.csv' },
        expect.anything(),
        expect.anything()
      )
      expect(mockProcessFile).toHaveBeenCalledWith(
        { s3key: 'land_covers/file2.csv' },
        expect.anything(),
        expect.anything()
      )
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

describe('filterFilesByEntityType', () => {
  it('should keep only land_parcels and land_covers files', () => {
    const files = [
      { Key: 'land_parcels/123/file.csv' },
      { Key: 'land_covers/456/file.csv' },
      { Key: 'moorland_designations/789/file.csv' },
      { Key: 'sssi/file.csv' },
      { Key: 'agreements/file.csv' }
    ]

    expect(filterFilesByEntityType(files)).toEqual([
      { Key: 'land_parcels/123/file.csv' },
      { Key: 'land_covers/456/file.csv' }
    ])
  })

  it('should return empty array when no files match ingest entity types', () => {
    const files = [
      { Key: 'moorland_designations/file.csv' },
      { Key: 'sssi/file.csv' }
    ]

    expect(filterFilesByEntityType(files)).toEqual([])
  })

  it('should return all files when all match ingest entity types', () => {
    const files = [
      { Key: 'land_parcels/file1.csv' },
      { Key: 'land_covers/file2.csv' }
    ]

    expect(filterFilesByEntityType(files)).toEqual(files)
  })
})
