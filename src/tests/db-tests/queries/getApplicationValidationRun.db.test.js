import { saveApplicationValidationRun } from '~/src/features/application/mutations/saveApplicationValidationRun.mutation.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'

import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Application Validation Run Query', () => {
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

    const getApplicationValidationRunResult = await getApplicationValidationRun(
      logger,
      connection,
      savedApplicationValidationRun.id
    )

    expect(getApplicationValidationRunResult).toMatchObject({
      id: savedApplicationValidationRun.id,
      ...applicationValidationRun
    })
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

    const result = await getApplicationValidationRun(
      logger,
      mockDb,
      savedApplicationValidationRun.id
    )

    expect(mockDb.connect).toHaveBeenCalled()
    const client = await mockDb.connect()
    expect(client.release).toHaveBeenCalled()
    expect(result).toBeNull()

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Database error' })
      }),
      'Database operation failed: Get application validation run'
    )
  })
})
