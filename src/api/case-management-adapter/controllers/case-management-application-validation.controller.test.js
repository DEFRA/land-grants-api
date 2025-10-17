import Hapi from '@hapi/hapi'
import { caseManagementAdapter } from '../index.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'
import { validateApplication } from '../../application/service/application-validation.service.js'

jest.mock('~/src/api/application/queries/getApplicationValidationRun.query.js')
jest.mock('../../application/service/application-validation.service.js')

describe('Case Management Application Validation Controller', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }

  const mockPostgresDb = {
    connect: jest.fn().mockImplementation(() => ({
      query: jest.fn(),
      release: jest.fn()
    }))
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)

    await server.register([caseManagementAdapter])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /case-management-adapter/application/validation-run/rerun', () => {
    const mockApplicationValidationRun = {
      id: 1,
      application_id: 'APP-123456',
      sbi: '123456789',
      crn: '1234567890',
      data: {
        application: {
          parcels: [
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              actions: [
                {
                  code: 'CMOR1',
                  quantity: 10
                }
              ]
            }
          ]
        }
      }
    }

    const mockApplicationData = {
      date: new Date('2025-10-09T00:00:00.000Z'),
      applicationId: 'APP-123456',
      applicantCrn: '1234567890',
      sbi: 123456789,
      hasPassed: true,
      applicationLevelResults: {},
      application: {
        agreementLevelActions: [],
        parcels: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            actions: [
              {
                code: 'CMOR1',
                quantity: 10
              }
            ]
          }
        ]
      },
      parcelLevelResults: []
    }

    test('should return 200 when validation passes', async () => {
      getApplicationValidationRun.mockResolvedValue(
        mockApplicationValidationRun
      )
      validateApplication.mockResolvedValue({
        validationErrors: null,
        applicationData: mockApplicationData,
        applicationValidationRunId: 1
      })

      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          requesterUsername: 'test.user@example.com',
          id: 1
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result).toEqual({
        message: 'Application validated successfully',
        valid: true,
        id: 1,
        date: mockApplicationData.date.toISOString()
      })

      expect(getApplicationValidationRun).toHaveBeenCalledWith(
        expect.any(Object),
        mockPostgresDb,
        1
      )

      expect(validateApplication).toHaveBeenCalledWith(
        mockApplicationValidationRun.data.application.parcels,
        mockApplicationValidationRun.application_id,
        mockApplicationValidationRun.crn,
        mockApplicationValidationRun.sbi,
        'test.user@example.com',
        expect.objectContaining({
          logger: expect.any(Object),
          server: expect.objectContaining({ postgresDb: expect.any(Object) })
        })
      )
    })

    test('should return 404 when application validation run is not found', async () => {
      getApplicationValidationRun.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          requesterUsername: 'test.user@example.com',
          id: 999
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(404)
      expect(result.message).toBe('Application validation run not found')

      expect(getApplicationValidationRun).toHaveBeenCalledWith(
        expect.any(Object),
        mockPostgresDb,
        999
      )

      expect(validateApplication).not.toHaveBeenCalled()
    })

    test('should return 400 when payload is missing requesterUsername', async () => {
      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          id: 1
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(400)
      expect(result.message).toBe('Invalid request payload input')
    })

    test('should return 400 when payload is missing id', async () => {
      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          requesterUsername: 'test.user@example.com'
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(400)
      expect(result.message).toBe('Invalid request payload input')
    })

    test('should return 400 when validation fails with errors', async () => {
      const validationErrors = [
        {
          field: 'landAction[0].actions[0].code',
          message: 'Invalid action code',
          code: 'INVALID_ACTION_CODE'
        },
        {
          field: 'landAction[0].parcelId',
          message: 'Parcel not found',
          code: 'PARCEL_NOT_FOUND'
        }
      ]

      getApplicationValidationRun.mockResolvedValue(
        mockApplicationValidationRun
      )
      validateApplication.mockResolvedValue({
        validationErrors,
        applicationData: null,
        applicationValidationRunId: null
      })

      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          requesterUsername: 'test.user@example.com',
          id: 1
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(400)
      expect(result).toEqual({
        message: validationErrors.map((err) => err.message).join(', '),
        error: 'Bad Request',
        statusCode: 400
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            action: 'Case management application validation',
            category: 'validation',
            reason: 'Invalid action code, Parcel not found',
            type: 'warn'
          }
        },
        'Validation failed: Case management application validation [sbi=123456789 | crn=1234567890 | validationRunId=1 | requesterUsername=test.user@example.com | applicationId=APP-123456]'
      )
    })

    test('should return 500 when validateApplication fails', async () => {
      getApplicationValidationRun.mockResolvedValue(
        mockApplicationValidationRun
      )
      validateApplication.mockRejectedValue(
        new Error('Validation service failed')
      )

      const request = {
        method: 'POST',
        url: '/case-management-adapter/application/validation-run/rerun',
        payload: {
          requesterUsername: 'test.user@example.com',
          id: 1
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation service failed'
          })
        }),
        'Business operation failed: Case Management validation run [validationRunId=1 | requesterUsername=test.user@example.com]'
      )
    })
  })
})
