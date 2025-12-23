import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { application } from '../index.js'
import { getApplicationValidationRun } from '../queries/getApplicationValidationRun.query.js'

vi.mock('~/src/api/application/queries/getApplicationValidationRun.query.js', () => ({
  getApplicationValidationRun: vi.fn()
}))

const mockGetApplicationValidationRun = vi.mocked(getApplicationValidationRun)

describe('Application Validation Run Controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
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

  describe('GET /application/{id}/validation-run', () => {
    test('should return 200 and application validation run', async () => {
      const applicationValidationRun = {
        id: '123',
        application_id: '1f27e9de-8072-4b17-a870-5575c62a0787',
        sbi: '214314',
        crn: '1937195628',
        created_at: new Date().toISOString(),
        data: {
          id: 1,
          application_id: '1f27e9de-8072-4b17-a870-5575c62a0787',
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
                      },
                      {
                        hasPassed: true,
                        name: 'has-available-area',
                        reason:
                          'There is sufficient available area (24.23 ha) for the applied figure (20ha)',
                        explanations: [
                          {
                            title: 'Total valid land cover',
                            lines: [
                              '  10 ha Grassland',
                              '+ 14.23 ha bracken',
                              '= 24.23 ha'
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
      mockGetApplicationValidationRun.mockResolvedValue(applicationValidationRun)

      const request = {
        method: 'POST',
        url: '/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.message).toBe(
        'Application validation run retrieved successfully'
      )
      expect(result.applicationValidationRun).toEqual(applicationValidationRun)
    })

    test('should return 404 if application validation run does not exist', async () => {
      mockGetApplicationValidationRun.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: '/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(404)
      expect(result.message).toBe('Application validation run not found')
    })

    test('should return 500 if application validation run query fails', async () => {
      mockGetApplicationValidationRun.mockRejectedValue(
        new Error('Error getting application validation run')
      )

      const request = {
        method: 'POST',
        url: '/application/validation-run/123'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
    })
  })
})
