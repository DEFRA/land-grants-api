/* eslint-disable jest/no-commented-out-tests */
import { jest } from '@jest/globals'
import {
  importLandParcels,
  importLandCovers,
  importMoorlandDesignations,
  importCompatibilityMatrix
} from './import-land-data.service.js'
import { createDBPool, getDBOptions } from '../../common/helpers/postgres.js'
import {
  createTempTable,
  copyDataToTempTable,
  insertData,
  truncateTableAndInsertData
} from './data-helpers.js'

jest.mock('../../common/helpers/postgres.js')
jest.mock('./data-helpers.js')

describe('Import Land Data Service', () => {
  let mockClient
  let mockConnection
  let mockLogger
  const ingestId = '1234567890'

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    }
    mockClient = {
      query: jest.fn().mockImplementation((query) => {
        if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: 1 }] })
        }
        return Promise.resolve({ rowCount: 1 })
      }),
      end: jest.fn()
    }
    mockConnection = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn()
    }
    createDBPool.mockReturnValue(mockConnection)
    getDBOptions.mockReturnValue({
      user: 'test-user',
      database: 'test-db',
      host: 'test-host',
      port: 5432
    })
    createTempTable.mockResolvedValue()
    copyDataToTempTable.mockResolvedValue()
    insertData.mockResolvedValue()
    truncateTableAndInsertData.mockResolvedValue()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('importLandParcels', () => {
    it('should import land parcels', async () => {
      const landParcelsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      await importLandParcels(landParcelsStream, ingestId, mockLogger)

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)
      expect(insertData).toHaveBeenCalledTimes(1)
      expect(insertData.mock.calls[0][2]).toEqual(ingestId)
      expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      expect(mockLogger.info).toHaveBeenCalledTimes(4)
    })

    it('should handle error when importing land parcels', async () => {
      const landParcelsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      createTempTable.mockRejectedValue(
        new Error('Failed to import land parcels')
      )

      await expect(
        importLandParcels(landParcelsStream, ingestId, mockLogger)
      ).rejects.toThrow('Failed to import land parcels')

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('importLandCovers', () => {
    it('should import land parcels', async () => {
      const landCoversStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      await importLandCovers(landCoversStream, ingestId, mockLogger)

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)
      expect(insertData).toHaveBeenCalledTimes(1)
      expect(insertData.mock.calls[0][2]).toEqual(ingestId)
      expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(4)
    })

    it('should handle error when importing land covers', async () => {
      const landCoversStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      createTempTable.mockRejectedValue(
        new Error('Failed to import land covers')
      )

      await expect(
        importLandCovers(landCoversStream, ingestId, mockLogger)
      ).rejects.toThrow('Failed to import land covers')

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('importMoorlandDesignations', () => {
    it('should import moorland designations', async () => {
      const moorlandDesignationsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      await importMoorlandDesignations(
        moorlandDesignationsStream,
        ingestId,
        mockLogger
      )

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)
      expect(insertData).toHaveBeenCalledTimes(1)
      expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      expect(truncateTableAndInsertData.mock.calls[0][2]).toEqual(ingestId)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(4)
    })

    it('should handle error when importing moorland designations', async () => {
      const moorlandDesignationsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      createTempTable.mockRejectedValue(
        new Error('Failed to import moorland designations')
      )

      await expect(
        importMoorlandDesignations(
          moorlandDesignationsStream,
          ingestId,
          mockLogger
        )
      ).rejects.toThrow('Failed to import moorland designations')

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('importCompatibilityMatrix', () => {
    it('should import compatibility matrix', async () => {
      const compatibilityMatrixStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      await importCompatibilityMatrix(
        compatibilityMatrixStream,
        ingestId,
        mockLogger
      )

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)
      expect(insertData).toHaveBeenCalledTimes(0)
      expect(truncateTableAndInsertData).toHaveBeenCalledTimes(1)
      expect(truncateTableAndInsertData.mock.calls[0][2]).toEqual(ingestId)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(4)
    })

    it('should handle error when importing compatibility matrix', async () => {
      const compatibilityMatrixStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      createTempTable.mockRejectedValue(
        new Error('Failed to import compatibility matrix')
      )

      await expect(
        importCompatibilityMatrix(
          compatibilityMatrixStream,
          ingestId,
          mockLogger
        )
      ).rejects.toThrow('Failed to import compatibility matrix')

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })
})
