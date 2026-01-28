import Hapi from '@hapi/hapi'
import { application } from '../../index.js'
import { getApplicationValidationRuns } from '../../queries/getApplicationValidationRuns.query.js'
import { applicationValidationRunTransformer } from '../../transformers/application.transformer.js'
import { vi } from 'vitest'

vi.mock('~/src/api/application/queries/getApplicationValidationRuns.query.js')
vi.mock('~/src/api/application/transformers/application.transformer.js')

describe('Application Validation Runs Controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    })

    server.decorate('server', 'postgresDb', {
      connect: vi.fn().mockImplementation(() => ({
        query: vi.fn(),
        release: vi.fn()
      }))
    })

    await server.register([application])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /application/{applicationId}/validation-runs', () => {
    const mockApplicationValidationRuns = [
      {
        id: 1,
        application_id: '12345',
        sbi: '214314',
        crn: '1937195628',
        created_at: new Date().toISOString(),
        data: {
          id: 1,
          application_id: '12345',
          requester: 'GrantsUI',
          sbi: '214314',
          grantsApiVersion: '1.3.8',
          hasPassed: false,
          created_at: new Date().toISOString(),
          application: {
            applicantCrn: '1937195628',
            agreementLevelActions: [],
            parcels: {
              sheetId: 'SI97386',
              parcelId: '37648',
              actions: [{ code: 'CMOR1', quantity: 20, unit: 'ha' }]
            }
          },
          applicationLevelResults: {
            hasPassed: true,
            rules: [
              {
                hasPassed: true,
                name: 'has-sufficient-budget',
                reason: 'There is enough budget to cover this application'
              }
            ]
          },
          parcelLevelResults: {
            parcels: [
              {
                sheetId: 'SI97386',
                parcelId: '37648',
                actions: [
                  {
                    hasPassed: false,
                    code: 'CMOR1',
                    actionConfigVersion: 17,
                    rules: [
                      {
                        hasPassed: false,
                        name: 'is-on-moorland',
                        reason: 'This parcel is not majority on the moorland',
                        explanations: [
                          {
                            title: 'Moorland check',
                            lines: [
                              'This parcel has a 23% intersection with the moorland layer. The target is 51%.'
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }
    ]

    const mockTransformedRuns = [
      {
        id: 1,
        created_at: mockApplicationValidationRuns[0].created_at
      }
    ]

    test('should return 200 and application validation runs with details when fields includes details', async () => {
      getApplicationValidationRuns.mockResolvedValue(
        mockApplicationValidationRuns
      )

      const request = {
        method: 'POST',
        url: '/application/12345/validation-run',
        payload: {
          fields: ['details']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(result.applicationValidationRuns).toEqual(
        mockApplicationValidationRuns
      )
      expect(getApplicationValidationRuns).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        '12345'
      )
      expect(applicationValidationRunTransformer).not.toHaveBeenCalled()
    })

    test('should return 200 and transformed application validation runs simple list', async () => {
      getApplicationValidationRuns.mockResolvedValue(
        mockApplicationValidationRuns
      )
      applicationValidationRunTransformer.mockReturnValue(mockTransformedRuns)

      const request = {
        method: 'POST',
        url: '/application/12345/validation-run',
        payload: {
          fields: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(result.applicationValidationRuns).toEqual(mockTransformedRuns)
      expect(applicationValidationRunTransformer).toHaveBeenCalledWith(
        mockApplicationValidationRuns
      )
    })

    test('should return 200 and empty array when no validation runs found', async () => {
      getApplicationValidationRuns.mockResolvedValue([])
      applicationValidationRunTransformer.mockReturnValue([])

      const request = {
        method: 'POST',
        url: '/application/12345/validation-run',
        payload: {
          fields: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation runs retrieved successfully'
      )
      expect(result.applicationValidationRuns).toEqual([])
      expect(getApplicationValidationRuns).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        '12345'
      )
      expect(applicationValidationRunTransformer).toHaveBeenCalledWith([])
    })

    test('should return 400 if applicationId parameter is missing', async () => {
      const request = {
        method: 'POST',
        url: '/application/validation-run',
        payload: {
          fields: ['details']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(404)
      expect(result.message).toBe('Not Found')
    })

    test('should return 500 if getApplicationValidationRuns query fails', async () => {
      const error = new Error('Database connection failed')
      getApplicationValidationRuns.mockRejectedValue(error)

      const request = {
        method: 'POST',
        url: '/application/12345/validation-run',
        payload: {
          fields: ['details']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
      expect(getApplicationValidationRuns).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        '12345'
      )
    })

    test('should log error details when an error occurs', async () => {
      const error = new Error('Database connection failed')
      getApplicationValidationRuns.mockRejectedValue(error)

      const request = {
        method: 'POST',
        url: '/application/12345/validation-run',
        payload: {
          fields: ['details']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(500)
    })
  })
})
