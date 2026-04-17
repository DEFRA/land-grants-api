import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import Boom from '@hapi/boom'
import { ApplicationValidationController } from './application-validation.controller.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { validateRequest } from '../../validation/application.validation.js'
import { validateLandParcelActions } from '../../service/land-parcel-validation.service.js'
import { saveApplication } from '../../mutations/saveApplication.mutation.js'
import { getActions } from '~/src/features/actions/service/action.service.js'
import {
  validateRequestData,
  validateAllLandParcels
} from '~/src/features/application/service/validation.service.js'

vi.mock('~/src/features/actions/service/action.service.js', () => ({
  getActions: vi.fn()
}))
vi.mock('~/src/features/available-area/compatibilityMatrix.js', () => ({
  createCompatibilityMatrix: vi.fn()
}))
vi.mock('../../validation/application.validation.js', () => ({
  validateRequest: vi.fn()
}))
vi.mock('../../service/land-parcel-validation.service.js', () => ({
  validateLandParcelActions: vi.fn()
}))
vi.mock('../../mutations/saveApplication.mutation.js', () => ({
  saveApplication: vi.fn()
}))
vi.mock('~/src/features/application/service/validation.service.js', () => ({
  validateRequestData: vi.fn(),
  validateAllLandParcels: vi.fn()
}))

const mockGetActions = vi.mocked(getActions)
const mockCreateCompatibilityMatrix = vi.mocked(createCompatibilityMatrix)
const mockValidateRequest = vi.mocked(validateRequest)
const mockValidateLandParcelActions = vi.mocked(validateLandParcelActions)
const mockSaveApplication = vi.mocked(saveApplication)
const mockValidateRequestData = vi.mocked(validateRequestData)
const mockValidateAllLandParcels = vi.mocked(validateAllLandParcels)

describe('ApplicationValidationController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  const mockActions = [
    {
      code: 'BND1',
      version: '1.0.0',
      startDate: '2025-01-01',
      durationYears: 3,
      description: 'Boundary management',
      applicationUnitOfMeasurement: 'ha',
      enabled: true,
      display: true,
      payment: {
        ratePerUnitGbp: 10.6,
        ratePerAgreementPerYearGbp: 272
      }
    },
    {
      code: 'BND2',
      version: '1.0.0',
      startDate: '2025-01-01',
      durationYears: 3,
      description: 'Boundary management 2',
      applicationUnitOfMeasurement: 'ha',
      enabled: true,
      display: true,
      payment: {
        ratePerUnitGbp: 15.0,
        ratePerAgreementPerYearGbp: 300
      }
    }
  ]

  const mockLandActions = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          code: 'BND1',
          quantity: 1.5
        },
        {
          code: 'BND2',
          quantity: 2.0
        }
      ]
    }
  ]

  const mockActionValidationResults = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          hasPassed: true,
          code: 'BND1',
          actionConfigVersion: '1.0.0',
          availableArea: {
            explanations: ['Valid area'],
            areaInHa: 1.5
          },
          rules: [
            {
              name: 'parcel-has-intersection-with-data-layer',
              passed: true,
              results: [
                {
                  name: 'parcel-has-intersection-with-data-layer',
                  passed: true
                }
              ]
            },
            {
              name: 'sssi-consent-required',
              passed: true,
              reason: 'No consent is required from Natural England',
              description: 'SSSI consent check',
              explanations: [
                {
                  title: 'sssi check',
                  lines: []
                }
              ]
            }
          ]
        }
      ]
    }
  ]

  const mockCompatibilityCheckFn = vi.fn()

  beforeAll(async () => {
    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)
    await server.register([
      {
        plugin: {
          name: 'application-validation',
          register: (server) => {
            server.route({
              method: 'POST',
              path: '/api/v2/application/validate',
              handler: ApplicationValidationController.handler,
              options: ApplicationValidationController.options
            })
          }
        }
      }
    ])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActions.mockResolvedValue(mockActions)
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockValidateRequestData.mockResolvedValue(null)
    mockValidateAllLandParcels.mockResolvedValue(mockActionValidationResults)
    mockSaveApplication.mockResolvedValue(1)
  })

  describe('POST /applications/validate route', () => {
    test('should return 200 with valid application when validation passes', async () => {
      const applicationId = 'APP-123'
      const sbi = 123456789
      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId,
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid, actions, id }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(true)
      expect(id).toBe(1)
      expect(actions).toEqual([
        {
          actionCode: 'BND1',
          hasPassed: true,
          parcelId: '9238',
          version: '1.0.0',
          rules: [
            {
              name: 'parcel-has-intersection-with-data-layer',
              passed: true
            },
            {
              name: 'sssi-consent-required',
              passed: true,
              reason: 'No consent is required from Natural England',
              description: 'SSSI consent check',
              explanations: [
                {
                  title: 'sssi check',
                  lines: []
                }
              ]
            }
          ],
          sheetId: 'SX0679'
        }
      ])

      // Verify all dependencies were called correctly
      expect(mockGetActions).toHaveBeenCalledWith(
        expect.objectContaining({ logger: expect.any(Object) }),
        mockPostgresDb,
        mockLandActions,
        'APP-123'
      )
      expect(mockValidateRequestData).toHaveBeenCalledWith(
        expect.objectContaining({ logger: expect.any(Object) }),
        {
          landActions: mockLandActions,
          actions: mockActions,
          applicationId,
          sbi
        }
      )
      expect(mockValidateAllLandParcels).toHaveBeenCalledWith(
        expect.objectContaining({ logger: expect.any(Object) }),
        mockPostgresDb,
        { landActions: mockLandActions, actions: mockActions }
      )
    })

    test('should return 400 when validation errors exist', async () => {
      const validationErrors = [
        'Land parcels not found: SX0679-9999',
        'Actions not found: INVALID1'
      ]
      mockValidateRequest.mockResolvedValue(validationErrors)

      const request = {
        method: 'POST',
        url: '/applications/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Not Found')
    })

    test('should return 400 when validation errors are null but array is not empty', async () => {
      mockValidateRequestData.mockResolvedValue(
        Boom.badRequest('Some validation error')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Some validation error')
    })

    test('should return 500 when getActions fails', async () => {
      mockGetActions.mockRejectedValue(new Error('Database connection failed'))

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        }),
        expect.stringContaining(
          'Business operation failed: Validate application'
        )
      )
    })

    test('should return 500 when createCompatibilityMatrix fails', async () => {
      mockValidateAllLandParcels.mockRejectedValue(
        new Error('Compatibility matrix creation failed')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when validateLandParcelActions fails', async () => {
      mockValidateAllLandParcels.mockRejectedValue(
        new Error('Land parcel validation failed')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 422 when quantity is not a valid number', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: [
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              actions: [
                {
                  code: 'BND1',
                  quantity: -1.5
                }
              ]
            }
          ]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(422)
      expect(message).toBe('Quantity must be a positive number')
    })

    test('should return 400 when land actions array is empty', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should handle null validation errors', async () => {
      mockValidateRequest.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(true)
    })

    test('should handle undefined validation errors', async () => {
      mockValidateRequest.mockResolvedValue(undefined)

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(true)
    })

    test('should return 400 and call validateRequestData when validation errors exist', async () => {
      mockValidateRequestData.mockResolvedValue(
        Boom.badRequest('Test validation error')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/application/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: mockLandActions
        }
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(mockValidateRequestData).toHaveBeenCalled()
      expect(mockValidateAllLandParcels).not.toHaveBeenCalled()
    })
  })
})
