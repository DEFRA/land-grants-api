import { saveApplication } from '~/src/api/actions/mutations/saveApplication.mutation.js'

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

    expect(savedApplication).toMatchObject(application)
  })
})
