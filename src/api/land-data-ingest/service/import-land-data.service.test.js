import { jest } from '@jest/globals'
import {
  importLandParcels,
  importLandCovers,
  importMoorlandDesignations
} from './import-land-data.service.js'
import { createDBPool, getDBOptions } from '../../common/helpers/postgres.js'
import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'

jest.mock('../../common/helpers/postgres.js')
jest.mock('pg-copy-streams')
jest.mock('node:stream/promises')
jest.mock('fs/promises')
jest.mock('../../common/helpers/read-file.js')

describe('Import Land Data Service', () => {
  let mockClient
  let mockConnection
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    }
    mockClient = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
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
    readFile.mockResolvedValue('SELECT * FROM test')
    from.mockReturnValue('')
    pipeline.mockResolvedValue()
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
      const result = await importLandParcels(landParcelsStream, mockLogger)

      expect(result).toBe(true)
      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(4)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(readFile.mock.calls[0][0]).toBe(
        '../../../../scripts/import-land-data/land_parcels/create_land_parcels_temp_table.sql'
      )
      expect(readFile.mock.calls[1][0]).toBe(
        '../../../../scripts/import-land-data/land_parcels/insert_land_parcels.sql'
      )
      expect(from).toHaveBeenCalledWith(
        "COPY land_parcels_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')"
      )
      expect(pipeline).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle error when importing land parcels', async () => {
      const landParcelsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      readFile.mockRejectedValue('Failed to import land parcels')

      const result = await importLandParcels(landParcelsStream, mockLogger)

      expect(result).toBe(false)
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
      const result = await importLandCovers(landCoversStream, mockLogger)

      expect(result).toBe(true)
      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(4)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(readFile.mock.calls[0][0]).toBe(
        '../../../../scripts/import-land-data/land_covers/create_land_covers_temp_table.sql'
      )
      expect(readFile.mock.calls[1][0]).toBe(
        '../../../../scripts/import-land-data/land_covers/insert_land_covers.sql'
      )
      expect(from).toHaveBeenCalledWith(
        "COPY land_covers_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')"
      )
      expect(pipeline).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle error when importing land covers', async () => {
      const landCoversStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      readFile.mockRejectedValue('Failed to import land parcels')

      const result = await importLandCovers(landCoversStream, mockLogger)

      expect(result).toBe(false)
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
      const result = await importMoorlandDesignations(
        moorlandDesignationsStream,
        mockLogger
      )

      expect(result).toBe(true)
      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(4)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(readFile.mock.calls[0][0]).toBe(
        '../../../../scripts/import-land-data/moorland_designations/create_moorland_designations_temp_table.sql'
      )
      expect(readFile.mock.calls[1][0]).toBe(
        '../../../../scripts/import-land-data/moorland_designations/insert_moorland_designations.sql'
      )
      expect(from).toHaveBeenCalledWith(
        "COPY moorland_designations_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')"
      )
      expect(pipeline).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).toHaveBeenCalledTimes(3)
    })

    it('should handle error when importing moorland designations', async () => {
      const moorlandDesignationsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      readFile.mockRejectedValue('Failed to import moorland designations')

      const result = await importMoorlandDesignations(
        moorlandDesignationsStream,
        mockLogger
      )

      expect(result).toBe(false)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })
})
