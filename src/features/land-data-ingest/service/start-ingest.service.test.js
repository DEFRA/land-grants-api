import {
  cancelPendingFiles,
  saveIngestStart,
  setFileInProgress,
  setFileCompleted,
  setFileFailed,
  setIngestCompleted,
  setIngestFailed,
  getFileExpectedRowCount,
  isValidIngestFile,
  getIngestById,
  getLatestEntityStatuses
} from './start-ingest.service.js'
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
      // UPDATE ingest_files (cancel pending files of cancelled ingest)
      dbClient.query.mockResolvedValueOnce({
        rows: []
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

  describe('setIngestFailed', () => {
    test('should set ingest status to failed', async () => {
      const ingestId = 'ingestId'

      await setIngestFailed(ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest SET status = $1 WHERE id = $2`,
        [INGEST_STATUS.FAILED, ingestId]
      )
    })
  })

  describe('cancelPendingFiles', () => {
    test('should cancel all pending files for a given ingest', async () => {
      const ingestId = 'ingestId'

      await cancelPendingFiles(ingestId, dbClient)

      expect(dbClient.query).toHaveBeenCalledWith(
        `UPDATE ingest_files SET status = $1 WHERE ingest_id = $2 AND status = $3`,
        [INGEST_STATUS.CANCELLED, ingestId, INGEST_STATUS.PENDING]
      )
    })
  })

  describe('getFileExpectedRowCount', () => {
    test('returns the expected row count for a file', async () => {
      dbClient.query.mockResolvedValueOnce({ rows: [{ total_rows: '123' }] })

      const result = await getFileExpectedRowCount(
        'ingestId',
        'file.csv',
        dbClient
      )

      expect(result).toBe(123)
      expect(dbClient.query).toHaveBeenCalledWith(
        `SELECT total_rows FROM ingest_files WHERE ingest_id = $1 AND filename = $2`,
        ['ingestId', 'file.csv']
      )
    })
  })

  describe('is valid ingest file', () => {
    test('makes correct db call', async () => {
      dbClient.query.mockResolvedValueOnce({
        rows: []
      })
      const result = await isValidIngestFile(123, 'filename', dbClient)

      expect(result).toBe(false)
      expect(dbClient.query).toHaveBeenCalledWith(
        `SELECT
      1
    FROM
      ingest_files f
      INNER JOIN ingest i ON i.id = f.ingest_id
    WHERE f.ingest_id = $1 AND filename = $2 AND f.status = $3 AND i.status = $4`,
        [123, 'filename', INGEST_STATUS.PENDING, INGEST_STATUS.IN_PROGRESS]
      )
    })
  })

  describe('get ingest by id', () => {
    test('should returns the ingest by id', async () => {
      const ingestId = 123
      const ingest = {
        rows: [{ id: 123 }]
      }
      const files = {
        rows: [
          {
            id: 1,
            filename: 'file.csv'
          }
        ]
      }
      dbClient.query.mockResolvedValueOnce(ingest)
      dbClient.query.mockResolvedValueOnce(files)

      const result = await getIngestById(ingestId, dbClient)

      expect(result).toEqual({ id: 123, files: files.rows })
    })

    test('should return null when no ingest found', async () => {
      const ingestId = 123
      const ingest = {
        rows: [null]
      }

      dbClient.query.mockResolvedValueOnce(ingest)

      const result = await getIngestById(ingestId, dbClient)

      expect(result).toBeNull()
    })
  })

  describe('get latest ingest status for all entities', () => {
    test('should returns the latest ingest status for land_parcels and land_covers', async () => {
      const ingestParcels = {
        rows: [{ id: 123, entity: 'land_parcels' }]
      }
      const parcelsFiles = {
        rows: [
          {
            id: 1,
            filename: 'file.csv'
          }
        ]
      }
      const ingestCovers = {
        rows: [{ id: 456, entity: 'land_covers' }]
      }
      const coversFiles = {
        rows: [
          {
            id: 2,
            filename: 'file2.csv'
          }
        ]
      }
      dbClient.query.mockImplementation((sql, params) => {
        const results = {
          land_parcels: ingestParcels,
          land_covers: ingestCovers,
          123: parcelsFiles,
          456: coversFiles
        }
        return Promise.resolve(results[params[0]] || { rows: [] })
      })

      const result = await getLatestEntityStatuses(dbClient)

      expect(result).toEqual([
        { ...ingestParcels.rows[0], files: parcelsFiles.rows },
        { ...ingestCovers.rows[0], files: coversFiles.rows }
      ])
    })

    test('should returns empty array when no ingest found', async () => {
      dbClient.query.mockResolvedValueOnce({ rows: [] })
      dbClient.query.mockResolvedValueOnce({ rows: [] })

      const result = await getLatestEntityStatuses(dbClient)

      expect(result).toEqual([])
    })
  })
})
