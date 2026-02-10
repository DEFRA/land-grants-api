import { saveApplicationValidationRun } from '~/src/features/application/mutations/saveApplicationValidationRun.mutation.js'
import { getApplicationValidationRuns } from '~/src/features/application/queries/getApplicationValidationRuns.query.js'

import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Application Validation Runs Query', () => {
  let logger, connection
  const applicationValidationRun = {
    application_id: '123456789',
    sbi: '123456789',
    crn: '123456789',
    data: {
      sheetId: 'SX0679',
      parcelId: '9238'
    }
  }

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

  test('should get application validation run', async () => {
    const savedApplicationValidationRun = await saveApplicationValidationRun(
      logger,
      connection,
      applicationValidationRun
    )

    const getApplicationValidationRunsResult =
      await getApplicationValidationRuns(
        logger,
        connection,
        savedApplicationValidationRun.application_id
      )

    // eslint-disable-next-line
    const { id, created_at, ...expectedFields } = savedApplicationValidationRun

    expect(getApplicationValidationRunsResult[0]).toMatchObject(expectedFields)
    expect(getApplicationValidationRunsResult[0].id).toBeGreaterThan(0)
    expect(getApplicationValidationRunsResult[0].created_at).not.toBeNull()
  })

  test('should release client in finally block when error occurs', async () => {
    const mockDb = {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockRejectedValue(new Error('Database error')),
        release: vi.fn()
      })
    }

    const savedApplicationValidationRun = await saveApplicationValidationRun(
      logger,
      connection,
      applicationValidationRun
    )

    const result = await getApplicationValidationRuns(
      logger,
      mockDb,
      savedApplicationValidationRun.application_id
    )

    expect(mockDb.connect).toHaveBeenCalled()
    const client = await mockDb.connect()
    expect(client.release).toHaveBeenCalled()
    expect(result).toBeNull()

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Database error' })
      }),
      'Database operation failed: Get application validation runs'
    )
  })
})
