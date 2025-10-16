import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Save application validation run result', () => {
  beforeAll(() => {
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
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn()
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
      'Database operation failed: saveApplicationValidationRun'
    )
  })
})
