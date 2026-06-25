import {
  truncateStagingTable,
  cancelAndCreateNewIngest,
  saveIngestStart,
  setFileInProgress,
  setFileCompleted,
  setFileFailed,
  setIngestCompleted,
  isValidIngestFile
} from './start-ingest.service.js'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'
import { INGEST_STATUS } from '../service/ingest-status.js'

vi.mock('../../common/helpers/logging/log-helpers.js', () => ({
  logBusinessError: vi.fn(),
  logInfo: vi.fn()
}))

describe('start ingest service', () => {
  let dbClient
  let logger

  beforeEach(() => {
    dbClient = {
      query: vi.fn().mockResolvedValue({ rows: [] })
    }
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('cancelAndCreateNewIngest', () => {
    test('should create new ingest', async () => {
      const entity = 'test_entity'
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      dbClient.query.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      })

      const result = await cancelAndCreateNewIngest(entity, dbClient, logger)

      expect(result).toEqual(123)
      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = $2 RETURNING id`,
        [entity, INGEST_STATUS.IN_PROGRESS]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
        [entity, INGEST_STATUS.IN_PROGRESS]
      )
    })

    test('should cancel in progress ingests and create new ingest', async () => {
      const entity = 'test_entity'
      dbClient.query.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      })
      dbClient.query.mockResolvedValueOnce({
        rows: [{ id: 456 }]
      })

      const result = await cancelAndCreateNewIngest(entity, dbClient, logger)

      expect(result).toEqual(456)
      expect(logInfo).toHaveBeenCalledWith(logger, {
        category: 'ingest',
        message: `Ingest tasks cancelled: 123`,
        context: {
          ids: [123],
          entity
        }
      })
      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = $2 RETURNING id`,
        [entity, INGEST_STATUS.IN_PROGRESS]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
        [entity, INGEST_STATUS.IN_PROGRESS]
      )
    })
  })

  describe('truncateStagingTable', () => {
    test('should truncate the pre-existing staging table', async () => {
      const entity = 'test_entity'

      await truncateStagingTable(entity, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `TRUNCATE TABLE ${entity}_staging`
      )
    })
  })

  describe('saveIngestStart', () => {
    test('should save ingest start data to the database', async () => {
      const entity = 'test_entity'
      const data = {
        files: [
          { filename: 'test_file_1', rows: 123 },
          { filename: 'test_file_2', rows: 456 }
        ]
      }
      // UPDATE ingest (cancel in progress)
      dbClient.query.mockResolvedValueOnce({
        rows: [{ id: 123 }]
      })
      // INSERT ingest
      dbClient.query.mockResolvedValueOnce({
        rows: [{ id: 456 }]
      })
      // INSERT ingest_files (file 1)
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      // INSERT ingest_files (file 2)
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      // TRUNCATE staging
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })

      await saveIngestStart(data, entity, dbClient, logger)

      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
        [entity, 'in_progress']
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest_files (ingest_id, filename, total_rows, status) VALUES ($1, $2, $3, $4)`,
        [456, 'test_file_1', 123, 'pending']
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest_files (ingest_id, filename, total_rows, status) VALUES ($1, $2, $3, $4)`,
        [456, 'test_file_2', 456, 'pending']
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `TRUNCATE TABLE ${entity}_staging`
      )
    })
  })

  describe('set file status', () => {
    test('setFileInProgress should set file status to in progress', async () => {
      const filename = 'filename'
      const ingestId = 'ingestId'

      await setFileInProgress(filename, ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest_files SET status = $1 WHERE ingest_id = $2 AND filename = $3`,
        [INGEST_STATUS.IN_PROGRESS, ingestId, filename]
      )
    })

    test('setFileCompleted should set file status to completed', async () => {
      const filename = 'filename'
      const ingestId = 'ingestId'

      await setFileCompleted(filename, ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest_files SET status = $1 WHERE ingest_id = $2 AND filename = $3`,
        [INGEST_STATUS.COMPLETED, ingestId, filename]
      )
    })

    test('setFileFailed should set file status to failed', async () => {
      const filename = 'filename'
      const ingestId = 'ingestId'

      await setFileFailed(filename, ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest_files SET status = $1 WHERE ingest_id = $2 AND filename = $3`,
        [INGEST_STATUS.FAILED, ingestId, filename]
      )
    })
  })

  describe('setIngestCompleted', () => {
    test('should set ingest status to completed and record the completion date', async () => {
      const ingestId = 'ingestId'

      await setIngestCompleted(ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest SET status = $1, completed_date = NOW() WHERE id = $2`,
        [INGEST_STATUS.COMPLETED, ingestId]
      )
    })
  })

  describe('is valid ingest file', () => {
    test('makes correct db call', async () => {
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      const result = await isValidIngestFile('filename', 123, dbClient)

      expect(result).toBe(false)
      expect(dbClient.query).toHaveBeenCalledWith(
        `SELECT
      1
    FROM
      ingest_files
    WHERE ingest_id = $1 AND filename = $2 AND status = $3`,
        ['filename', 123, INGEST_STATUS.PENDING]
      )
    })
  })
})
