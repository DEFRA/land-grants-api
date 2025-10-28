import { jest } from '@jest/globals'
import { importLandParcels } from './import-land-data.service.js'
import { createDBPool } from '../../common/helpers/postgres.js'
import { readFile } from './read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'

jest.mock('../../common/helpers/postgres.js')
jest.mock('pg-copy-streams')
jest.mock('node:stream/promises')
jest.mock('fs/promises')
jest.mock('./read-file.js')

describe('Import Land Data Service', () => {
  let mockClient
  let mockConnection

  beforeEach(() => {
    mockClient = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
      end: jest.fn()
    }
    mockConnection = {
      connect: jest.fn().mockResolvedValue(mockClient)
    }
    createDBPool.mockReturnValue(mockConnection)
    readFile.mockResolvedValue('SELECT * FROM test')
    from.mockReturnValue('')
    pipeline.mockResolvedValue()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('importLandParcels', () => {
    // Tests go here
    it('should import land parcels', async () => {
      const landParcelsStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      const result = await importLandParcels(landParcelsStream)

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
    })
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

    const result = await importLandParcels(landParcelsStream)

    expect(result).toBe(false)
    expect(mockClient.end).toHaveBeenCalledTimes(1)
  })
})
