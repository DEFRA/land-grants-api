import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { application } from '~/src/api/application/index.js'
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'
import * as dbQuery from '~/src/api/application/queries/getApplicationValidationRun.query.js'

describe('Application Validation Run Controller', () => {
  let logger, connection
  const server = Hapi.server()

  beforeAll(async () => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
    server.decorate('request', 'logger', logger)
    server.decorate('server', 'postgresDb', connection)

    await server.register([application])
    await server.initialize()
  })

  afterAll(async () => {
    await connection.end()
    await server.stop()
  })

  test('should return a 200 status code and return an application validation run', async () => {
    const applicationValidationRun = {
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: {
        sheetId: 'SX0679',
        parcelId: '9238'
      }
    }

    const savedApplicationValidationRun = await saveApplicationValidationRun(
      logger,
      connection,
      applicationValidationRun
    )

    const request = {
      method: 'POST',
      url: `/application/validation-run/${savedApplicationValidationRun.id}`
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const { statusCode, payload } = await server.inject(request)
    const result = JSON.parse(payload)

    expect(statusCode).toBe(200)
    expect(result.message).toBe(
      'Application validation run retrieved successfully'
    )
    expect(result.applicationValidationRun).toMatchObject({
      id: savedApplicationValidationRun.id,
      application_id: '123456789',
      sbi: '123456789',
      crn: '123456789',
      data: { sheetId: 'SX0679', parcelId: '9238' },
      created_at: expect.any(String)
    })
  })

  test('should return a 404 status code when application validation run does not exist', async () => {
    const request = {
      method: 'POST',
      url: `/application/validation-run/123`
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const { statusCode, payload } = await server.inject(request)
    const result = JSON.parse(payload)

    expect(statusCode).toBe(404)
    expect(result.message).toBe('Application validation run not found')
  })

  test('should return a 500 status code when application validation run query fails', async () => {
    vi.spyOn(dbQuery, 'getApplicationValidationRun').mockImplementation(() => {
      throw new Error('Error getting application validation run')
    })

    const request = {
      method: 'POST',
      url: `/application/validation-run/123`
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const { statusCode, payload } = await server.inject(request)
    const result = JSON.parse(payload)

    expect(statusCode).toBe(500)
    expect(result.message).toBe('An internal server error occurred')
  })
})
