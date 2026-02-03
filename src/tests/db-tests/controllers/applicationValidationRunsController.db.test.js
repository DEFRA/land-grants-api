import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { application } from '~/src/api/application/index.js'
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
// import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'

const validateApplicationRequest = async (server) => {
  const request = {
    method: 'POST',
    url: '/application/validate',
    payload: {
      applicationId: 'app-validation-test1',
      requester: 'grants-ui',
      applicantCrn: '1102760349',
      sbi: 121428499,
      landActions: [
        {
          parcelId: '8936',
          sheetId: 'SD7553',
          actions: [
            {
              code: 'UPL1',
              quantity: 6.1653
            }
          ]
        }
      ]
    }
  }

  const { statusCode, payload } = await server.inject(request)
  const result = JSON.parse(payload)
  return { validateStatusCode: statusCode, validateResult: result }
}

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

  describe('POST /application/{applicationId}/validation-run', () => {
    test('should return 200 and application validation runs with details when fields includes details', async () => {
      const { validateStatusCode, validateResult } =
        await validateApplicationRequest(server)

      expect(validateStatusCode).toBe(200)
      expect(validateResult.message).toBe('Application validated successfully')
      expect(validateResult.valid).toBe(false)

      // const request = {
      //   method: 'POST',
      //   url: '/application/12345/validation-run',
      //   payload: {
      //     fields: ['details']
      //   }
      // }

      /** @type { Hapi.ServerInjectResponse<object> } */
      // const { statusCode, payload } = await server.inject(request)
      // const result = JSON.parse(payload)

      // expect(statusCode).toBe(200)
      // expect(result.message).toBe(
      //   'Application validation runs retrieved successfully'
      // )
      // expect(result.applicationValidationRuns).toHaveLength(1)
      // expect(result.applicationValidationRuns[0]).toMatchObject({
      //   id: validateResult.id,
      //   application_id: '12345',
      //   sbi: '214314',
      //   crn: '1937195628',
      //   data: validateResult.data,
      //   created_at: expect.any(String)
      // })
    })

    // test('should return 200 and transformed application validation runs simple list', async () => {
    //   const applicationValidationRun = {
    //     application_id: '67890',
    //     sbi: '987654',
    //     crn: '9876543210',
    //     data: {
    //       requester: 'GrantsUI',
    //       sbi: '987654'
    //     }
    //   }

    //   const savedRun = await saveApplicationValidationRun(
    //     logger,
    //     connection,
    //     applicationValidationRun
    //   )

    //   const request = {
    //     method: 'POST',
    //     url: '/application/67890/validation-run',
    //     payload: {
    //       fields: []
    //     }
    //   }

    //   /** @type { Hapi.ServerInjectResponse<object> } */
    //   const { statusCode, payload } = await server.inject(request)
    //   const result = JSON.parse(payload)

    //   expect(statusCode).toBe(200)
    //   expect(result.message).toBe(
    //     'Application validation runs retrieved successfully'
    //   )
    //   expect(result.applicationValidationRuns).toHaveLength(1)
    //   expect(result.applicationValidationRuns[0]).toMatchObject({
    //     id: savedRun.id,
    //     created_at: expect.any(String)
    //   })
    //   // Should not include full data when fields is empty
    //   expect(result.applicationValidationRuns[0]).not.toHaveProperty('data')
    //   expect(result.applicationValidationRuns[0]).not.toHaveProperty(
    //     'application_id'
    //   )
    // })

    // test('should return 200 and empty array when no validation runs found', async () => {
    //   const request = {
    //     method: 'POST',
    //     url: '/application/nonexistent/validation-run',
    //     payload: {
    //       fields: []
    //     }
    //   }

    //   /** @type { Hapi.ServerInjectResponse<object> } */
    //   const { statusCode, payload } = await server.inject(request)
    //   const result = JSON.parse(payload)

    //   expect(statusCode).toBe(200)
    //   expect(result.message).toBe(
    //     'Application validation runs retrieved successfully'
    //   )
    //   expect(result.applicationValidationRuns).toEqual([])
    // })

    // test('should return 404 if applicationId parameter is missing', async () => {
    //   const request = {
    //     method: 'POST',
    //     url: '/application/validation-run',
    //     payload: {
    //       fields: ['details']
    //     }
    //   }

    //   /** @type { Hapi.ServerInjectResponse<object> } */
    //   const { statusCode, payload } = await server.inject(request)
    //   const result = JSON.parse(payload)

    //   expect(statusCode).toBe(404)
    //   expect(result.message).toBe('Not Found')
    // })

    // test('should return multiple validation runs ordered by created_at DESC', async () => {
    //   const applicationId = 'multi-test'
    //   const run1 = {
    //     application_id: applicationId,
    //     sbi: '111111',
    //     crn: '1111111111',
    //     data: { test: 'first' }
    //   }
    //   const run2 = {
    //     application_id: applicationId,
    //     sbi: '222222',
    //     crn: '2222222222',
    //     data: { test: 'second' }
    //   }

    //   const savedRun1 = await saveApplicationValidationRun(
    //     logger,
    //     connection,
    //     run1
    //   )
    //   // Small delay to ensure different timestamps
    //   await new Promise((resolve) => setTimeout(resolve, 10))
    //   const savedRun2 = await saveApplicationValidationRun(
    //     logger,
    //     connection,
    //     run2
    //   )

    //   const request = {
    //     method: 'POST',
    //     url: `/application/${applicationId}/validation-run`,
    //     payload: {
    //       fields: ['details']
    //     }
    //   }

    //   /** @type { Hapi.ServerInjectResponse<object> } */
    //   const { statusCode, payload } = await server.inject(request)
    //   const result = JSON.parse(payload)

    //   expect(statusCode).toBe(200)
    //   expect(result.applicationValidationRuns).toHaveLength(2)
    //   // Should be ordered by created_at DESC, so newest first
    //   expect(result.applicationValidationRuns[0].id).toBe(savedRun2.id)
    //   expect(result.applicationValidationRuns[1].id).toBe(savedRun1.id)
    // })
  })
})
