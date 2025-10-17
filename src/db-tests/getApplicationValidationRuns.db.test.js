import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'
import { getApplicationValidationRuns } from '~/src/api/application/queries/getApplicationValidationRuns.query.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get application validation runs', () => {
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

    expect(getApplicationValidationRunsResult[0]).toMatchObject({
      ...savedApplicationValidationRun
    })
  })

  test('should release client in finally block when error occurs', async () => {
    const mockDb = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn()
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
