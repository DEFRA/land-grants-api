import {
  dropAndCreateNewStagingTable,
  cancelAndCreateNewIngest,
  saveIngestStart
} from './start-ingest.service.js'
import {
  logBusinessError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'

vi.mock('../../common/helpers/logging/log-helpers.js', () => ({
  logBusinessError: vi.fn(),
  logInfo: vi.fn()
}))

describe('start ingest service', () => {
  let dbClient
  let logger

  beforeEach(() => {
    dbClient = {
      query: vi.fn()
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
        `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = 'in_progress' RETURNING id`,
        [entity]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
        [entity, 'in_progress']
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
        `UPDATE ingest SET status = 'cancelled' WHERE entity = $1 AND status = 'in_progress' RETURNING id`,
        [entity]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `INSERT INTO ingest (entity, status) VALUES ($1, $2) RETURNING id`,
        [entity, 'in_progress']
      )
    })
  })

  describe('dropAndCreateNewStagingTable', () => {
    test('should create a new staging table', async () => {
      const entity = 'test_entity'
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      await dropAndCreateNewStagingTable(entity, dbClient, logger)

      expect(dbClient.query).toHaveBeenCalledWith(
        `SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
        [`${entity}_staging`]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `CREATE TABLE ${entity}_staging (LIKE ${entity})`
      )
    })

    test('should drop the staging table if it exists', async () => {
      const entity = 'test_entity'

      dbClient.query.mockResolvedValueOnce({
        rows: [{ tablename: `${entity}_staging` }]
      })

      await dropAndCreateNewStagingTable(entity, dbClient, logger)

      expect(dbClient.query).toHaveBeenCalledWith(
        `DROP TABLE ${entity}_staging`
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `CREATE TABLE ${entity}_staging (LIKE ${entity})`
      )
      expect(logBusinessError).toHaveBeenCalledWith(logger, {
        operation: 'start_ingest',
        context: `${entity}_staging`,
        error: new Error('Staging table already exists')
      })
    })
  })

  describe('saveIngestStart', () => {
    test('should save ingest start data to the database', async () => {
      const entity = 'test_entity'
      const data = {
        files: [
          { filename: 'test_file_1', row_count: 123 },
          { filename: 'test_file_2', row_count: 456 }
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
      // SELECT pg_tables (staging table exists)
      dbClient.query.mockResolvedValueOnce({
        rows: [{ tablename: `${entity}_staging` }]
      })
      // DROP TABLE staging
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      // CREATE TABLE staging
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
        `SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
        [`${entity}_staging`]
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `DROP TABLE ${entity}_staging`
      )
      expect(dbClient.query).toHaveBeenCalledWith(
        `CREATE TABLE ${entity}_staging (LIKE ${entity})`
      )
    })
  })
})
