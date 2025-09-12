import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get application validation run', () => {
  const applicationValidationRun = {
    application_id: '123456789',
    sbi: '123456789',
    crn: '123456789',
    data: {
      sheetId: 'SX0679',
      parcelId: '9238'
    }
  }

  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await saveApplicationValidationRun(
      logger,
      connection,
      applicationValidationRun
    )
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should get application validation run', async () => {
    const getApplicationValidationRunResult = await getApplicationValidationRun(
      logger,
      connection,
      applicationValidationRun.application_id
    )

    expect(getApplicationValidationRunResult).toMatchObject(
      applicationValidationRun
    )
  })

  test('should release client in finally block when error occurs', async () => {
    const mockDb = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn()
      })
    }

    const result = await getApplicationValidationRun(
      logger,
      mockDb,
      applicationValidationRun.application_id
    )

    expect(mockDb.connect).toHaveBeenCalled()
    const client = await mockDb.connect()
    expect(client.release).toHaveBeenCalled()
    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      'Error executing get application validation run by id query: Database error'
    )
  })
})
