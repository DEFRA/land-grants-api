import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { application } from '~/src/api/application/index.js'
import {
  connectToTestDatbase,
  truncateTable
} from '~/src/tests/db-tests/setup/postgres.js'
import {
  validateApplicationRequest,
  getApplicationValidationRunsRequest,
  applicationRequest
} from './index.js'

describe('Application Validation Runs Controller', () => {
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

  describe('POST /application/{applicationId}/validation-run', () => {
    test('should return 200 and application validation runs with details when fields includes details', async () => {
      const { validateStatusCode, validateResult } =
        await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode).toBe(200)
      expect(validateResult.message).toBe('Application validated successfully')

      const request = {
        method: 'POST',
        url: `/application/${applicationRequest.applicationId}/validation-run`,
        payload: {
          fields: ['details']
        }
      }

      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(result.applicationValidationRuns).toHaveLength(1)
      expect(result.applicationValidationRuns[0]).toMatchObject({
        id: validateResult.id,
        application_id: applicationRequest.applicationId,
        sbi: applicationRequest.sbi,
        crn: applicationRequest.applicantCrn,
        created_at: expect.any(String),
        data: expect.any(Object)
      })
    })

    test('should return 200 and transformed application validation runs simple list', async () => {
      const { validateStatusCode, validateResult } =
        await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode).toBe(200)
      expect(validateResult.message).toBe('Application validated successfully')

      const { getStatusCode, getResult } =
        await getApplicationValidationRunsRequest(
          server,
          applicationRequest.applicationId,
          []
        )
      expect(getStatusCode).toBe(200)
      expect(getResult.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(getResult.applicationValidationRuns).toHaveLength(1)
      expect(getResult.applicationValidationRuns[0]).toEqual({
        id: validateResult.id,
        created_at: expect.any(String)
      })
    })

    test('should return 200 and empty array when no validation runs found', async () => {
      const request = {
        method: 'POST',
        url: '/application/nonexistent/validation-run',
        payload: {
          fields: []
        }
      }

      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(result.applicationValidationRuns).toEqual([])
    })

    test('should return 404 if applicationId parameter is missing', async () => {
      const request = {
        method: 'POST',
        url: '/application/validation-run',
        payload: {
          fields: ['details']
        }
      }

      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    test('should return multiple validation runs ordered by created_at DESC', async () => {
      // Create first validation run
      const {
        validateStatusCode: validateStatusCode1,
        validateResult: validateResult1
      } = await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode1).toBe(200)
      expect(validateResult1.message).toBe('Application validated successfully')

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create second validation run
      const {
        validateStatusCode: validateStatusCode2,
        validateResult: validateResult2
      } = await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode2).toBe(200)
      expect(validateResult2.message).toBe('Application validated successfully')

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Create third validation run
      const {
        validateStatusCode: validateStatusCode3,
        validateResult: validateResult3
      } = await validateApplicationRequest(server, applicationRequest)

      expect(validateStatusCode3).toBe(200)
      expect(validateResult3.message).toBe('Application validated successfully')

      // Retrieve all validation runs
      const { getStatusCode, getResult } =
        await getApplicationValidationRunsRequest(
          server,
          applicationRequest.applicationId,
          []
        )

      expect(getStatusCode).toBe(200)
      expect(getResult.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(getResult.applicationValidationRuns).toHaveLength(3)

      // Verify results are ordered by created_at DESC (most recent first)
      const runs = getResult.applicationValidationRuns
      expect(new Date(runs[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(runs[1].created_at).getTime()
      )
      expect(new Date(runs[1].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(runs[2].created_at).getTime()
      )

      // Verify the most recent run is first
      expect(runs[0].id).toBe(validateResult3.id)
      expect(runs[1].id).toBe(validateResult2.id)
      expect(runs[2].id).toBe(validateResult1.id)
    })
  })
})
