import { readFile } from '../../common/helpers/read-file.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import {
  createTempTable,
  copyDataToTempTable,
  insertData,
  truncateTableAndInsertData
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
})
