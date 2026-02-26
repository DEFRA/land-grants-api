import { importData } from './import-land-data.service.js'
import { createDBPool, getDBOptions } from '../../common/helpers/postgres.js'
import {
  createTempTable,
  copyDataToTempTable,
  insertData,
  truncateTableAndInsertData
} from './data-helpers.js'
import { metricsCounter } from '../../common/helpers/metrics.js'

import { resources } from '../workers/ingest.module.js'

vi.mock('../../common/helpers/postgres.js')
vi.mock('./data-helpers.js')
vi.mock('../../common/helpers/metrics.js')

describe('Import Land Data Service', () => {
  let mockClient
  let mockConnection
  let mockLogger
  const ingestId = '1234567890'

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
    mockClient = {
      query: vi.fn().mockImplementation((query) => {
        if (query.includes('SELECT COUNT(*)')) {
          return Promise.resolve({ rows: [{ count: 1 }] })
        }
        return Promise.resolve({ rowCount: 1 })
      }),
      end: vi.fn()
    }
    mockConnection = {
      connect: vi.fn().mockResolvedValue(mockClient),
      end: vi.fn()
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
    insertData.mockResolvedValue({ rowCount: 1 })
    truncateTableAndInsertData.mockResolvedValue({ rowCount: 1 })
    metricsCounter.mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe.each(resources)('import $name', ({ name, truncateTable }) => {
    it(`should import ${name}`, async () => {
      const dataStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      await importData(dataStream, name, ingestId, mockLogger, truncateTable)

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)

      if (truncateTable) {
        expect(truncateTableAndInsertData).toHaveBeenCalledTimes(1)
        expect(truncateTableAndInsertData.mock.calls[0][2]).toEqual(ingestId)
        expect(insertData).toHaveBeenCalledTimes(0)
      } else {
        expect(insertData).toHaveBeenCalledTimes(1)
        expect(insertData.mock.calls[0][2]).toEqual(ingestId)
        expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      }

      expect(mockLogger.info).toHaveBeenCalledTimes(4)
      expect(metricsCounter).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${name}_data_ingest_completed`,
        1
      )
    })

    it(`should handle error when importing ${name}`, async () => {
      const dataStream = new ReadableStream({
        read: () =>
          Promise.resolve({
            value: 'test',
            done: true
          })
      })
      createTempTable.mockRejectedValue(new Error(`Failed to import ${name}`))

      await expect(
        importData(dataStream, name, ingestId, mockLogger, truncateTable)
      ).rejects.toThrow(`Failed to import ${name}`)

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${name}_data_ingest_failed`,
        1
      )
    })
  })
})
