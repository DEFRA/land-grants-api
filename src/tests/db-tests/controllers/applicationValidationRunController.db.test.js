import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { application } from '~/src/api/application/index.js'
import {
  connectToTestDatbase,
  truncateTable
} from '~/src/tests/db-tests/setup/postgres.js'
import * as dbQuery from '~/src/api/application/queries/getApplicationValidationRun.query.js'
import {
  validateApplicationRequest,
  getApplicationValidationRunRequest,
  applicationRequest
} from './index.js'

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

  beforeEach(async () => {
    await truncateTable(connection, 'application_results')
  })

  describe('POST /application/validation-run/{id}', () => {
    test('should return a 200 status code and return an application validation run', async () => {
      const { validateStatusCode, validateResult } =
        await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode).toBe(200)
      expect(validateResult.message).toBe('Application validated successfully')

      const { getStatusCode, getResult } =
        await getApplicationValidationRunRequest(server, validateResult.id, [])

      expect(getStatusCode).toBe(200)
      expect(getResult.message).toBe(
        'Application validation run retrieved successfully'
      )
      expect(getResult.applicationValidationRun).toMatchObject({
        id: validateResult.id,
        application_id: applicationRequest.applicationId,
        sbi: applicationRequest.sbi,
        crn: applicationRequest.applicantCrn,
        created_at: expect.any(String),
        data: expect.any(Object)
      })
    })

    test('should return a 404 status code when application validation run does not exist', async () => {
      const { getStatusCode, getResult } =
        await getApplicationValidationRunRequest(server, 123, [])

      expect(getStatusCode).toBe(404)
      expect(getResult.message).toBe('Application validation run not found')
    })

    test('should return a 500 status code when application validation run query fails', async () => {
      vi.spyOn(dbQuery, 'getApplicationValidationRun').mockImplementation(
        () => {
          throw new Error('Error getting application validation run')
        }
      )

      const { getStatusCode, getResult } =
        await getApplicationValidationRunRequest(server, 123, [])

      expect(getStatusCode).toBe(500)
      expect(getResult.message).toBe('An internal server error occurred')
    })
  })
})
