import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest'
import { importData } from './import-land-data.service.js'
import { createDBPool, getDBOptions } from '../../common/helpers/postgres.js'
import {
  createTempTable,
  copyDataToTempTable,
  getTableRowCount,
  insertData,
  truncateTableAndInsertData,
  isIngestComplete,
  promoteStagingTable,
  logDuplicateRows
} from './data-helpers.js'
import {
  setFileInProgress,
  setFileCompleted,
  setFileFailed,
  setIngestCompleted,
  getFileExpectedRowCount
} from './start-ingest.service.js'
import { metricsCounter } from '../../common/helpers/metrics.js'

import { ENTITY_TYPES } from '../../common/constants/entity_types.js'

vi.mock('../../common/helpers/postgres.js')
vi.mock('./data-helpers.js')
vi.mock('./start-ingest.service.js')
vi.mock('../../common/helpers/metrics.js')

const validateEntities = ENTITY_TYPES.filter((entity) => entity.ingest === true)
const asIsEntities = ENTITY_TYPES.filter((entity) => entity.ingest !== true)

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
    isIngestComplete.mockResolvedValue({
      isComplete: true,
      isOverCount: false,
      totalCount: 1
    })
    promoteStagingTable.mockResolvedValue()
    setFileInProgress.mockResolvedValue()
    setFileCompleted.mockResolvedValue()
    setFileFailed.mockResolvedValue()
    setIngestCompleted.mockResolvedValue()
    getFileExpectedRowCount.mockResolvedValue(1)
    getTableRowCount.mockResolvedValue(1)
    metricsCounter.mockResolvedValue()
    logDuplicateRows.mockResolvedValue(0)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const makeStream = () =>
    new ReadableStream({
      read: () =>
        Promise.resolve({
          value: 'test',
          done: true
        })
    })

  describe.each(validateEntities)('import (validate) $name', (entity) => {
    it(`should import ${entity.name} and promote when ingest is complete`, async () => {
      await importData(makeStream(), entity, ingestId, 'file.csv', mockLogger)

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(setFileInProgress).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)
      expect(insertData).toHaveBeenCalledTimes(1)
      expect(setFileCompleted).toHaveBeenCalledTimes(1)
      expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      expect(isIngestComplete).toHaveBeenCalledTimes(1)
      expect(promoteStagingTable).toHaveBeenCalledTimes(1)
      expect(setIngestCompleted).toHaveBeenCalledWith(ingestId, mockClient)

      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_data_ingest_completed`,
        1
      )
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_file_ingest_completed`,
        1
      )

      if (entity.name === 'land_parcels') {
        expect(logDuplicateRows).toHaveBeenCalledWith(
          mockClient,
          'land_parcels',
          ['SHEET_ID', 'PARCEL_ID'],
          mockLogger
        )
      } else {
        expect(logDuplicateRows).not.toHaveBeenCalled()
      }
    })

    it(`should not promote ${entity.name} when ingest is incomplete`, async () => {
      isIngestComplete.mockResolvedValue({
        isComplete: false,
        isOverCount: false,
        totalCount: 0
      })

      await importData(makeStream(), entity, ingestId, 'file.csv', mockLogger)

      expect(promoteStagingTable).toHaveBeenCalledTimes(0)
      expect(setIngestCompleted).not.toHaveBeenCalled()
      expect(metricsCounter).not.toHaveBeenCalledWith(
        `${entity.name}_data_ingest_completed`,
        expect.anything()
      )
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_file_ingest_completed`,
        1
      )
    })

    it(`should fail ${entity.name} and not promote when per-file row count does not match`, async () => {
      getTableRowCount.mockResolvedValue(5)
      getFileExpectedRowCount.mockResolvedValue(3)

      await expect(
        importData(makeStream(), entity, ingestId, 'file.csv', mockLogger)
      ).rejects.toThrow(
        `File row count mismatch for file.csv: expected 3, got 5`
      )

      expect(promoteStagingTable).not.toHaveBeenCalled()
      expect(setIngestCompleted).not.toHaveBeenCalled()
      expect(setFileFailed).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_data_ingest_failed`,
        1
      )
    })

    it(`should fail ${entity.name} and not promote when ingest row count exceeds expected total`, async () => {
      isIngestComplete.mockResolvedValue({
        isComplete: false,
        isOverCount: true,
        totalCount: 99
      })

      await expect(
        importData(makeStream(), entity, ingestId, 'file.csv', mockLogger)
      ).rejects.toThrow(
        `Ingest row count does not match expected total for ${entity.name}`
      )

      expect(promoteStagingTable).toHaveBeenCalledTimes(0)
      expect(setIngestCompleted).not.toHaveBeenCalled()
      expect(setFileFailed).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(2)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_data_ingest_failed`,
        1
      )
    })

    it(`should handle error when importing ${entity.name}`, async () => {
      createTempTable.mockRejectedValue(
        new Error(`Failed to import ${entity.name}`)
      )

      await expect(
        importData(makeStream(), entity, ingestId, 'file.csv', mockLogger)
      ).rejects.toThrow(`Failed to import ${entity.name}`)

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(setFileFailed).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_data_ingest_failed`,
        1
      )
    })
  })

  describe.each(asIsEntities)('import (as is) $name', (entity) => {
    it(`should import ${entity.name}`, async () => {
      await importData(makeStream(), entity, ingestId, '', mockLogger)

      expect(mockConnection.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(createTempTable).toHaveBeenCalledTimes(1)
      expect(copyDataToTempTable).toHaveBeenCalledTimes(1)

      if (entity.truncateTable) {
        expect(truncateTableAndInsertData).toHaveBeenCalledTimes(1)
        expect(truncateTableAndInsertData.mock.calls[0][2]).toEqual(ingestId)
        expect(insertData).toHaveBeenCalledTimes(0)
      } else {
        expect(insertData).toHaveBeenCalledTimes(1)
        expect(insertData.mock.calls[0][2]).toEqual(ingestId)
        expect(truncateTableAndInsertData).toHaveBeenCalledTimes(0)
      }

      expect(setFileInProgress).toHaveBeenCalledTimes(0)
      expect(isIngestComplete).toHaveBeenCalledTimes(0)
      expect(promoteStagingTable).toHaveBeenCalledTimes(0)

      expect(metricsCounter).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_file_ingest_completed`,
        1
      )
    })

    it(`should handle error when importing ${entity.name}`, async () => {
      createTempTable.mockRejectedValue(
        new Error(`Failed to import ${entity.name}`)
      )

      await expect(
        importData(makeStream(), entity, ingestId, '', mockLogger)
      ).rejects.toThrow(`Failed to import ${entity.name}`)

      expect(mockClient.end).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledTimes(1)
      expect(metricsCounter).toHaveBeenCalledWith(
        `${entity.name}_data_ingest_failed`,
        1
      )
    })
  })
})
