import { saveApplication } from '~/src/api/application/mutations/saveApplication.mutation.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Save application', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should save application', async () => {
    const application = {
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: {
        sheetId: 'SX0679',
        parcelId: '9238'
      }
    }
    const savedApplication = await saveApplication(
      logger,
      connection,
      application
    )

    expect(savedApplication).toBeGreaterThan(0)
  })

  test('should release client in finally block when error occurs', async () => {
    const mockDb = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn()
      })
    }

    const application = {
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: {
        sheetId: 'SX0679',
        parcelId: '9238'
      }
    }

    const result = await saveApplication(logger, mockDb, application)

    expect(mockDb.connect).toHaveBeenCalled()
    const client = await mockDb.connect()
    expect(client.release).toHaveBeenCalled()
    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      'Error executing get action query: Database error'
    )
  })
})
