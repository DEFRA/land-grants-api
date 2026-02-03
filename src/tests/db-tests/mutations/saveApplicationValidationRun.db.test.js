import { vi } from 'vitest'
import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Save Application Validation Run Mutation', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should save application validation run result', async () => {
    const applicationValidationRun = {
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: {
        sheetId: 'SX0679',
        parcelId: '9238'
      }
    }
    const savedApplicationValidationRunResult =
      await saveApplicationValidationRun(
        logger,
        connection,
        applicationValidationRun
      )

    expect(savedApplicationValidationRunResult).toMatchObject(
      applicationValidationRun
    )
  })

  test('should release client in finally block when error occurs', async () => {
    const mockDb = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockRejectedValue(new Error('Database error')),
        release: vi.fn()
      })
    }

    const applicationValidationRun = {
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: {
        sheetId: 'SX0679',
        parcelId: '9238'
      }
    }

    const result = await saveApplicationValidationRun(
      logger,
      mockDb,
      applicationValidationRun
    )

    expect(mockDb.connect).toHaveBeenCalled()
    const client = await mockDb.connect()
    expect(client.release).toHaveBeenCalled()
    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Database error' })
      }),
      'Database operation failed: Save application validation run'
    )
  })
})
