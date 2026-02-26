import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getResourceByType, resources } from './ingest.module.js'
import { metricsCounter } from '../../common/helpers/metrics.js'

vi.mock('../../common/s3/s3.js', () => ({
  getFile: vi.fn(),
  failedBucketPath: vi.fn((path) => `failed/${path}`)
}))

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn(() => 'test-bucket')
  }
}))

vi.mock('../../common/plugins/s3-client.js', () => ({
  createS3Client: vi.fn(() => ({ client: 'mock-s3-client' }))
}))

vi.mock('../service/import-land-data.service.js', () => ({
  importData: vi.fn()
}))

vi.mock('../../common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn()
  }))
}))

vi.mock('../../common/helpers/logging/log-helpers.js', () => ({
  logInfo: vi.fn(),
  logBusinessError: vi.fn()
}))
vi.mock('../../common/helpers/metrics.js')

describe('Ingest Module', () => {
  describe('getResourceByType', () => {
    it('should return correct resource for all valid resource types', () => {
      resources.forEach((resource) => {
        const result = getResourceByType(resource.name)
        expect(result).toBe(resource)
        expect(result).toEqual({
          name: resource.name,
          truncateTable: resource.truncateTable
        })
      })
    })

    it('should throw error for non-existent resource type', () => {
      expect(() => getResourceByType('invalid_resource')).toThrow(
        'Resource type invalid_resource not found'
      )
    })

    it('should throw error for invalid inputs', () => {
      expect(() => getResourceByType('')).toThrow()
      expect(() => getResourceByType(null)).toThrow()
      expect(() => getResourceByType(undefined)).toThrow()
    })

    it('should be case-sensitive', () => {
      expect(() => getResourceByType('Land_Parcels')).toThrow(
        'Resource type Land_Parcels not found'
      )
    })
  })

  describe('importLandData', () => {
    let importLandData
    let getFile
    let importData
    let logBusinessError

    beforeEach(async () => {
      vi.clearAllMocks()

      const module = await import('./ingest.module.js')
      const s3Module = await import('../../common/s3/s3.js')
      const importServiceModule = await import(
        '../service/import-land-data.service.js'
      )
      const logHelpersModule = await import(
        '../../common/helpers/logging/log-helpers.js'
      )

      importLandData = module.importLandData
      getFile = s3Module.getFile
      importData = importServiceModule.importData
      logBusinessError = logHelpersModule.logBusinessError
    })

    it('should successfully import land data with valid CSV file', async () => {
      const mockResponse = {
        ContentType: 'text/csv',
        ContentLength: 1024,
        Body: {
          transformToWebStream: vi.fn().mockResolvedValue('stream-data')
        }
      }

      getFile.mockResolvedValue(mockResponse)
      importData.mockResolvedValue(undefined)

      const result = await importLandData('land_parcels/123/test.csv')

      expect(result).toBe('Land data imported successfully')
      expect(getFile).toHaveBeenCalledWith(
        { client: 'mock-s3-client' },
        'test-bucket',
        'land_parcels/123/test.csv'
      )
      expect(importData).toHaveBeenCalledWith(
        'stream-data',
        'land_parcels',
        '123',
        expect.any(Object),
        false
      )
    })

    it('should throw error for invalid content type', async () => {
      const mockResponse = {
        ContentType: 'application/json',
        Body: {
          transformToWebStream: vi.fn()
        }
      }

      getFile.mockResolvedValue(mockResponse)

      await expect(
        importLandData('land_parcels/123/test.json')
      ).rejects.toThrow('Invalid content type: application/json')

      expect(importData).not.toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
    })

    it('should handle S3 errors', async () => {
      const s3Error = new Error('S3 connection failed')
      getFile.mockRejectedValue(s3Error)

      await expect(importLandData('land_parcels/123/test.csv')).rejects.toThrow(
        'S3 connection failed'
      )

      expect(logBusinessError).toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
    })

    it('should handle invalid resource type in file path', async () => {
      const mockResponse = {
        ContentType: 'text/csv',
        Body: {
          transformToWebStream: vi.fn().mockResolvedValue('stream-data')
        }
      }

      getFile.mockResolvedValue(mockResponse)

      await expect(
        importLandData('invalid_resource/123/test.csv')
      ).rejects.toThrow('Resource type invalid_resource not found')

      expect(logBusinessError).toHaveBeenCalled()
      expect(metricsCounter).toHaveBeenCalledWith('land_data_ingest_failed', 1)
    })
  })
})
