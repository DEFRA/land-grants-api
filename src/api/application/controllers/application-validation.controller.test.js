import Hapi from '@hapi/hapi'
import { ApplicationValidationController } from './application-validation.controller.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateRequest } from '../validation/application.validation.js'
import { validateLandParcelActions } from '../service/land-parcel-validation.service.js'
import {
  errorMessagesTransformer,
  applicationDataTransformer
} from '../transformers/application.transformer.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'

// Mock all dependencies
jest.mock('~/src/api/actions/queries/getActions.query.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')
jest.mock('../validation/application.validation.js')
jest.mock('../service/land-parcel-validation.service.js')
jest.mock('../transformers/application.transformer.js')
jest.mock('../mutations/saveApplication.mutation.js')

const mockGetEnabledActions = getEnabledActions
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockValidateRequest = validateRequest
const mockValidateLandParcelActions = validateLandParcelActions
const mockErrorMessagesTransformer = errorMessagesTransformer
const mockApplicationDataTransformer = applicationDataTransformer
const mockSaveApplication = saveApplication

describe('ApplicationValidationController', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }

  const mockPostgresDb = {
    connect: jest.fn(),
    query: jest.fn()
  }

  const mockActions = [
    {
      code: 'BND1',
      version: 1,
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
      version: 1,
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

  const mockParcelResults = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          hasPassed: true,
          code: 'BND1',
          actionConfigVersion: '1',
          availableArea: {
            explanations: ['Valid area'],
            areaInHa: 1.5
          },
          rules: [{ passed: true, results: [] }]
        },
        {
          hasPassed: true,
          code: 'BND2',
          actionConfigVersion: '1',
          availableArea: {
            explanations: ['Valid area'],
            areaInHa: 2.0
          },
          rules: [{ passed: true, results: [] }]
        }
      ]
    }
  ]

  const mockApplicationData = {
    date: new Date(),
    applicationId: 'APP-123',
    applicantCrn: 'CRN-456',
    sbi: 123456789,
    requester: 'test-user',
    landGrantsApiVersion: '1.0.0',
    hasPassed: true,
    applicationLevelResults: {},
    application: {
      agreementLevelActions: [],
      parcels: mockLandActions.map((parcel) => ({
        sheetId: parcel.sheetId,
        parcelId: parcel.parcelId,
        actions: parcel.actions
      }))
    },
    parcelLevelResults: mockParcelResults
  }

  const mockCompatibilityCheckFn = jest.fn()

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
              path: '/applications/validate',
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
    jest.clearAllMocks()

    // Default mock implementations
    mockGetEnabledActions.mockResolvedValue(mockActions)
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockValidateRequest.mockResolvedValue([])
    mockValidateLandParcelActions.mockResolvedValue(mockParcelResults[0])
    mockErrorMessagesTransformer.mockReturnValue([])
    mockApplicationDataTransformer.mockReturnValue(mockApplicationData)
    mockSaveApplication.mockResolvedValue(1)
  })

  describe('POST /applications/validate route', () => {
    test('should return 200 with valid application when validation passes', async () => {
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
        result: { message, valid, errorMessages, id }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(true)
      expect(errorMessages).toEqual([])
      expect(id).toBe(1)

      // Verify all dependencies were called correctly
      expect(mockGetEnabledActions).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
      expect(mockValidateRequest).toHaveBeenCalledWith(
        mockLandActions,
        mockActions,
        expect.objectContaining({
          logger: expect.any(Object),
          server: expect.objectContaining({ postgresDb: expect.any(Object) })
        })
      )
      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
      expect(mockValidateLandParcelActions).toHaveBeenCalledWith(
        mockLandActions[0],
        mockActions,
        mockCompatibilityCheckFn,
        expect.objectContaining({
          logger: expect.any(Object),
          server: expect.objectContaining({ postgresDb: expect.any(Object) })
        })
      )
      expect(mockApplicationDataTransformer).toHaveBeenCalledWith(
        'APP-123',
        'CRN-456',
        123456789,
        'test-user',
        mockLandActions,
        [mockParcelResults[0]]
      )
      expect(mockErrorMessagesTransformer).toHaveBeenCalledWith([
        mockParcelResults[0]
      ])
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

      expect(statusCode).toBe(400)
      expect(message).toBe(
        'Land parcels not found: SX0679-9999, Actions not found: INVALID1'
      )

      // Verify validation was called but not the rest of the flow
      expect(mockValidateRequest).toHaveBeenCalled()
      expect(mockCreateCompatibilityMatrix).not.toHaveBeenCalled()
      expect(mockValidateLandParcelActions).not.toHaveBeenCalled()
      expect(mockApplicationDataTransformer).not.toHaveBeenCalled()
    })

    test('should return 400 when validation errors are null but array is not empty', async () => {
      const validationErrors = ['Some validation error']
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

      expect(statusCode).toBe(400)
      expect(message).toBe('Some validation error')
    })

    test('should handle multiple land actions correctly', async () => {
      const multipleLandActions = [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [{ code: 'BND1', quantity: 1.5 }]
        },
        {
          sheetId: 'SX0680',
          parcelId: '9239',
          actions: [{ code: 'BND2', quantity: 2.0 }]
        }
      ]

      const multipleParcelResults = [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [
            {
              hasPassed: true,
              code: 'BND1',
              actionConfigVersion: '1',
              availableArea: { explanations: [], areaInHa: 1.5 },
              rules: [{ passed: true, results: [] }]
            }
          ]
        },
        {
          sheetId: 'SX0680',
          parcelId: '9239',
          actions: [
            {
              hasPassed: true,
              code: 'BND2',
              actionConfigVersion: '1',
              availableArea: { explanations: [], areaInHa: 2.0 },
              rules: [{ passed: true, results: [] }]
            }
          ]
        }
      ]

      mockValidateLandParcelActions
        .mockResolvedValueOnce(multipleParcelResults[0])
        .mockResolvedValueOnce(multipleParcelResults[1])

      const request = {
        method: 'POST',
        url: '/applications/validate',
        payload: {
          applicationId: 'APP-123',
          requester: 'test-user',
          applicantCrn: 'CRN-456',
          sbi: 123456789,
          landActions: multipleLandActions
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

      // Verify validateLandParcelActions was called for each land action
      expect(mockValidateLandParcelActions).toHaveBeenCalledTimes(2)
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        1,
        multipleLandActions[0],
        mockActions,
        mockCompatibilityCheckFn,
        expect.any(Object)
      )
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        2,
        multipleLandActions[1],
        mockActions,
        mockCompatibilityCheckFn,
        expect.any(Object)
      )
    })

    test('should return 500 when getEnabledActions fails', async () => {
      mockGetEnabledActions.mockRejectedValue(
        new Error('Database connection failed')
      )

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

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error validating application: Database connection failed',
        {
          error: 'Database connection failed',
          stack: expect.any(String)
        }
      )
    })

    test('should return 500 when createCompatibilityMatrix fails', async () => {
      mockCreateCompatibilityMatrix.mockRejectedValue(
        new Error('Compatibility matrix creation failed')
      )

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

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when validateLandParcelActions fails', async () => {
      mockValidateLandParcelActions.mockRejectedValue(
        new Error('Land parcel validation failed')
      )

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

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when applicationDataTransformer fails', async () => {
      mockApplicationDataTransformer.mockImplementation(() => {
        throw new Error('Application data transformation failed')
      })

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

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should handle application with failed validation results', async () => {
      const failedParcelResults = [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          actions: [
            {
              hasPassed: false,
              code: 'BND1',
              actionConfigVersion: '1',
              availableArea: {
                explanations: ['Insufficient area'],
                areaInHa: 0.5
              },
              rules: [
                {
                  passed: false,
                  results: [],
                  reason: 'Insufficient area available'
                }
              ]
            }
          ]
        }
      ]

      const failedApplicationData = {
        ...mockApplicationData,
        hasPassed: false
      }

      const errorMessages = [
        {
          code: 'BND1',
          description: 'Insufficient area available',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: false
        }
      ]

      mockValidateLandParcelActions.mockResolvedValue(failedParcelResults[0])
      mockApplicationDataTransformer.mockReturnValue(failedApplicationData)
      mockErrorMessagesTransformer.mockReturnValue(errorMessages)

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
        result: { message, valid, errorMessages: responseErrorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(false)
      expect(responseErrorMessages).toEqual(errorMessages)
    })

    test('should return 422 when quantity is not a valid number', async () => {
      const request = {
        method: 'POST',
        url: '/applications/validate',
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
        url: '/applications/validate',
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
        result: { message, valid }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('Application validated successfully')
      expect(valid).toBe(true)
    })

    test('should log validation errors when they exist', async () => {
      const validationErrors = ['Test validation error']
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

      await server.inject(request)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation errors',
        validationErrors
      )
    })
  })
})
