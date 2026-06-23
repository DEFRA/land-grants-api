import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import {
  createTempTable,
  copyDataToTempTable,
  insertData,
  truncateTableAndInsertData,
  createStagingTable,
  isIngestComplete,
  promoteStagingTable,
  logDuplicateRows
} from './data-helpers.js'
import { vi } from 'vitest'

vi.mock('../../common/helpers/read-file.js', () => ({
  readFile: vi.fn()
}))
vi.mock('pg-copy-streams', () => ({
  from: vi.fn()
}))
vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn()
}))

describe('Data helpers', () => {
  let dbClient

  beforeEach(() => {
    dbClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }),
      end: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should create a temporary table', async () => {
    await createTempTable(dbClient, 'agreements')

    expect(dbClient.query).toHaveBeenCalledTimes(2)
    expect(dbClient.query.mock.calls[0][0]).toBe(
      'DROP TABLE IF EXISTS agreements_tmp CASCADE;'
    )
    expect(dbClient.query.mock.calls[1][0]).toBe(
      await readFile(`/agreements/create_agreements_temp_table.sql`)
    )
  })

  test('should copy data to the temporary table', async () => {
    const mockWritableStream = new WritableStream()
    dbClient.query.mockReturnValue(mockWritableStream)
    const dataStream = new ReadableStream({
      read: () =>
        Promise.resolve({
          value: 'test',
          done: true
        })
    })
    await copyDataToTempTable(dbClient, 'agreements', dataStream)

    expect(dbClient.query).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith(
      "COPY agreements_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')"
    )
    expect(pipeline).toHaveBeenCalledTimes(1)
    expect(pipeline.mock.calls[0][0]).toBe(dataStream)
    expect(pipeline.mock.calls[0][1]).toBeInstanceOf(WritableStream)

    // pipeline is mocked, so the streams are never consumed; close them so the
    // open WritableStream does not leak pending work into later tests.
    await mockWritableStream.close()
    await dataStream.cancel()
  })

  test('should insert data into the table', async () => {
    await insertData(dbClient, 'agreements', '123')

    expect(dbClient.query).toHaveBeenCalledTimes(1)
    expect(dbClient.query.mock.calls[0][0]).toBe(
      await readFile(`/agreements/insert_agreements.sql`)
    )
    expect(dbClient.query.mock.calls[0][1]).toEqual(['123'])
  })

  describe('truncateTableAndInsertData', () => {
    test('should truncate the table and insert data', async () => {
      const result = await truncateTableAndInsertData(
        dbClient,
        'agreements',
        '123'
      )

      expect(result?.rowCount).toBe(1)
      expect(dbClient.query).toHaveBeenCalledTimes(4)
      expect(dbClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(dbClient.query.mock.calls[1][0]).toBe('TRUNCATE TABLE agreements;')
      expect(dbClient.query.mock.calls[2][0]).toBe(
        await readFile(`/agreements/insert_agreements.sql`)
      )
      expect(dbClient.query.mock.calls[2][1]).toEqual(['123'])
      expect(dbClient.query.mock.calls[3][0]).toBe('COMMIT')
    })

    test('should handle error when truncating the table and inserting data', async () => {
      dbClient.query.mockRejectedValue(new Error('Error truncating table'))
      await expect(
        truncateTableAndInsertData(dbClient, 'agreements', '123')
      ).rejects.toThrow('Error truncating table')

      expect(dbClient.query).toHaveBeenCalledTimes(2)
      expect(dbClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(dbClient.query.mock.calls[1][0]).toBe('ROLLBACK')
    })
  })

  describe('createStagingTable', () => {
    beforeEach(() => {
      dbClient.escapeIdentifier = vi.fn((id) => `"${id}"`)
    })

    test('should return early when the staging table already exists', async () => {
      dbClient.query.mockResolvedValueOnce({ rows: [{ exists: true }] })

      await createStagingTable(dbClient, 'land_parcels')

      expect(dbClient.query).toHaveBeenCalledTimes(1)
      expect(dbClient.query.mock.calls[0][1]).toEqual(['land_parcels_staging'])
      expect(dbClient.escapeIdentifier).not.toHaveBeenCalled()
    })

    test('should create the staging table when it does not exist', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rows: [{ exists: false }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              fk_query:
                'ALTER TABLE "land_parcels_staging" ADD CONSTRAINT fk_a FOREIGN KEY (id) REFERENCES other(id);'
            }
          ]
        })
        .mockResolvedValue({ rowCount: 1 })

      await createStagingTable(dbClient, 'land_parcels')

      expect(dbClient.query).toHaveBeenCalledTimes(2)
      expect(dbClient.query.mock.calls[1][0]).toBe(
        'CREATE TABLE "land_parcels_staging" (LIKE "land_parcels" INCLUDING ALL);'
      )
    })

    test('should create the staging table without running constraint queries when there are no foreign keys', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rows: [{ exists: false }] })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] })

      await createStagingTable(dbClient, 'land_covers')

      expect(dbClient.query).toHaveBeenCalledTimes(2)
      expect(dbClient.query.mock.calls[1][0]).toBe(
        'CREATE TABLE "land_covers_staging" (LIKE "land_covers" INCLUDING ALL);'
      )
    })
  })

  describe('isIngestComplete', () => {
    test('should return isComplete true when staging count matches the expected total rows', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rows: [{ count: '9' }] })
        .mockResolvedValueOnce({ rows: [{ total_rows: '9' }] })

      const result = await isIngestComplete('land_parcels', 123, dbClient)

      expect(result).toEqual({
        isComplete: true,
        isOverCount: false,
        totalCount: 9
      })
      expect(dbClient.query.mock.calls[0][0]).toBe(
        'SELECT count(*) as count FROM land_parcels_staging'
      )
      expect(dbClient.query.mock.calls[1][1]).toEqual([123])
    })

    test('should return isComplete false when staging count does not match the expected total rows', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rows: [{ count: '4' }] })
        .mockResolvedValueOnce({ rows: [{ total_rows: '9' }] })

      const result = await isIngestComplete('land_parcels', 123, dbClient)

      expect(result).toEqual({
        isComplete: false,
        isOverCount: false,
        totalCount: 4
      })
    })

    test('should return isOverCount true when staging count exceeds the expected total rows', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rows: [{ count: '12' }] })
        .mockResolvedValueOnce({ rows: [{ total_rows: '9' }] })

      const result = await isIngestComplete('land_parcels', 123, dbClient)

      expect(result).toEqual({
        isComplete: false,
        isOverCount: true,
        totalCount: 12
      })
    })
  })

  describe('logDuplicateRows', () => {
    test('logs and returns the number of duplicate rows found', async () => {
      dbClient.query.mockResolvedValueOnce({
        rows: [{ duplicate_count: '3' }]
      })
      const logger = { info: vi.fn() }

      const result = await logDuplicateRows(
        dbClient,
        'land_parcels',
        ['SHEET_ID', 'PARCEL_ID'],
        logger
      )

      expect(result).toBe(3)
      expect(dbClient.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) - COUNT(DISTINCT (SHEET_ID, PARCEL_ID)) AS duplicate_count FROM land_parcels_tmp'
      )
      expect(logger.info).toHaveBeenCalled()
    })

    test('logs zero when there are no duplicates', async () => {
      dbClient.query.mockResolvedValueOnce({
        rows: [{ duplicate_count: '0' }]
      })
      const logger = { info: vi.fn() }

      const result = await logDuplicateRows(
        dbClient,
        'land_parcels',
        ['SHEET_ID', 'PARCEL_ID'],
        logger
      )

      expect(result).toBe(0)
      expect(logger.info).toHaveBeenCalled()
    })
  })

  describe('promoteStagingTable', () => {
    test('should swap the staging table into the live table within a transaction', async () => {
      await promoteStagingTable('land_parcels', dbClient)

      expect(dbClient.query).toHaveBeenCalledTimes(5)
      expect(dbClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(dbClient.query.mock.calls[1][0]).toBe(
        'ALTER TABLE land_parcels RENAME TO land_parcels_retiring'
      )
      expect(dbClient.query.mock.calls[2][0]).toBe(
        'ALTER TABLE land_parcels_staging RENAME TO land_parcels'
      )
      expect(dbClient.query.mock.calls[3][0]).toBe(
        'DROP TABLE IF EXISTS land_parcels_retiring'
      )
      expect(dbClient.query.mock.calls[4][0]).toBe('COMMIT')
    })

    test('should roll back and rethrow when promotion fails', async () => {
      dbClient.query
        .mockResolvedValueOnce({ rowCount: 1 }) // BEGIN
        .mockRejectedValueOnce(new Error('rename failed'))

      await expect(
        promoteStagingTable('land_parcels', dbClient)
      ).rejects.toThrow('rename failed')

      expect(dbClient.query.mock.calls[0][0]).toBe('BEGIN')
      expect(dbClient.query).toHaveBeenLastCalledWith('ROLLBACK')
    })
  })
})
