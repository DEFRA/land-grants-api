import { validateApplication } from './application-validation.service.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import { applicationDataTransformer } from '../transformers/application.transformer.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { validateRequest } from '../validation/application.validation.js'
import { getEnabledActions } from '../../actions/queries/getActions.query.js'

jest.mock('~/src/available-area/compatibilityMatrix.js')
jest.mock('../mutations/saveApplication.mutation.js')
jest.mock('../transformers/application.transformer.js')
jest.mock('./land-parcel-validation.service.js')
jest.mock('../validation/application.validation.js')
jest.mock('../../actions/queries/getActions.query.js')

const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockSaveApplication = saveApplication
const mockApplicationDataTransformer = applicationDataTransformer
const mockValidateLandParcelActions = validateLandParcelActions
const mockValidateRequest = validateRequest
const mockGetEnabledActions = getEnabledActions

describe('Application Validation Service', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }

  const mockPostgresDb = {
    connect: jest.fn(),
    query: jest.fn()
  }

  const mockRequest = {
    logger: mockLogger,
    server: {
      postgresDb: mockPostgresDb
    }
  }

  const mockLandAction = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          code: 'CMOR1',
          quantity: 10
        }
      ]
    },
    {
      sheetId: 'SX0680',
      parcelId: '9239',
      actions: [
        {
          code: 'UPL1',
          quantity: 5
        }
      ]
    }
  ]

  const mockApplicationId = 'APP-123456'
  const mockCrn = '1234567890'
  const mockSbi = '123456789'
  const mockRequesterUsername = 'test.user@example.com'

  const mockEnabledActions = [
    {
      code: 'CMOR1',
      name: 'Create and restore moorland',
      version: '1'
    },
    {
      code: 'UPL1',
      name: 'Upland grassland',
      version: '1'
    }
  ]

  const mockCompatibilityCheckFn = jest.fn()

  const mockParcelResults = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          hasPassed: true,
          code: 'CMOR1',
          actionConfigVersion: '1',
          availableArea: {
            explanations: ['Area calculation successful'],
            areaInHa: 0.1
          },
          rules: [
            {
              name: 'parcel-has-intersection-with-data-layer',
              passed: true,
              message: 'Success'
            }
          ]
        }
      ]
    },
    {
      sheetId: 'SX0680',
      parcelId: '9239',
      actions: [
        {
          hasPassed: true,
          code: 'UPL1',
          actionConfigVersion: '1',
          availableArea: {
            explanations: ['Area calculation successful'],
            areaInHa: 0.05
          },
          rules: [
            {
              name: 'parcel-has-intersection-with-data-layer',
              passed: true,
              message: 'Success'
            }
          ]
        }
      ]
    }
  ]

  const mockApplicationData = {
    applicationId: mockApplicationId,
    crn: mockCrn,
    sbi: mockSbi,
    requesterUsername: mockRequesterUsername,
    parcels: mockParcelResults
  }

  const mockApplicationValidationRunId = 'val-run-123'

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetEnabledActions.mockResolvedValue(mockEnabledActions)
    mockValidateRequest.mockResolvedValue(null)
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockValidateLandParcelActions.mockResolvedValue(mockParcelResults[0])
    mockApplicationDataTransformer.mockReturnValue(mockApplicationData)
    mockSaveApplication.mockResolvedValue(mockApplicationValidationRunId)
  })

  describe('validateApplication', () => {
    test('should successfully validate an application', async () => {
      mockValidateLandParcelActions
        .mockResolvedValueOnce(mockParcelResults[0])
        .mockResolvedValueOnce(mockParcelResults[1])

      const result = await validateApplication(
        mockLandAction,
        mockApplicationId,
        mockCrn,
        mockSbi,
        mockRequesterUsername,
        mockRequest
      )

      expect(result).toEqual({
        validationErrors: null,
        applicationData: mockApplicationData,
        applicationValidationRunId: mockApplicationValidationRunId
      })

      expect(mockGetEnabledActions).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )

      expect(mockValidateRequest).toHaveBeenCalledWith(
        mockLandAction,
        mockEnabledActions,
        mockRequest
      )

      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )

      expect(mockValidateLandParcelActions).toHaveBeenCalledTimes(2)
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        1,
        mockLandAction[0],
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockRequest
      )
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        2,
        mockLandAction[1],
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockRequest
      )

      expect(mockApplicationDataTransformer).toHaveBeenCalledWith(
        mockApplicationId,
        mockCrn,
        mockSbi,
        mockRequesterUsername,
        mockLandAction,
        [mockParcelResults[0], mockParcelResults[1]]
      )

      expect(mockSaveApplication).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        {
          applicationId: mockApplicationId,
          sbi: mockSbi,
          crn: mockCrn,
          data: mockApplicationData
        }
      )
    })

    test('should return validation errors when request validation fails', async () => {
      const mockValidationErrors = [
        {
          field: 'landAction',
          message: 'Invalid land action data',
          code: 'VALIDATION_ERROR'
        }
      ]

      mockValidateRequest.mockResolvedValue(mockValidationErrors)

      const result = await validateApplication(
        mockLandAction,
        mockApplicationId,
        mockCrn,
        mockSbi,
        mockRequesterUsername,
        mockRequest
      )

      expect(result).toEqual({
        validationErrors: mockValidationErrors,
        applicationData: null,
        applicationValidationRunId: null
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation errors',
        mockValidationErrors
      )

      expect(mockGetEnabledActions).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )

      expect(mockValidateRequest).toHaveBeenCalledWith(
        mockLandAction,
        mockEnabledActions,
        mockRequest
      )

      // Should not proceed to parcel validation
      expect(mockCreateCompatibilityMatrix).not.toHaveBeenCalled()
      expect(mockValidateLandParcelActions).not.toHaveBeenCalled()
      expect(mockApplicationDataTransformer).not.toHaveBeenCalled()
      expect(mockSaveApplication).not.toHaveBeenCalled()
    })

    test('should handle multiple validation errors', async () => {
      const mockMultipleErrors = [
        {
          field: 'landAction[0].actions[0].code',
          message: 'Invalid action code',
          code: 'INVALID_ACTION_CODE'
        },
        {
          field: 'landAction[0].parcelId',
          message: 'Parcel not found',
          code: 'PARCEL_NOT_FOUND'
        },
        {
          field: 'landAction[1].actions[0].quantity',
          message: 'Invalid quantity',
          code: 'INVALID_QUANTITY'
        }
      ]

      mockValidateRequest.mockResolvedValue(mockMultipleErrors)

      const result = await validateApplication(
        mockLandAction,
        mockApplicationId,
        mockCrn,
        mockSbi,
        mockRequesterUsername,
        mockRequest
      )

      expect(result).toEqual({
        validationErrors: mockMultipleErrors,
        applicationData: null,
        applicationValidationRunId: null
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Validation errors',
        mockMultipleErrors
      )
    })

    test('should handle error when getting enabled actions fails', async () => {
      const dbError = new Error('Database connection failed')
      mockGetEnabledActions.mockRejectedValue(dbError)

      await expect(
        validateApplication(
          mockLandAction,
          mockApplicationId,
          mockCrn,
          mockSbi,
          mockRequesterUsername,
          mockRequest
        )
      ).rejects.toThrow('Database connection failed')

      expect(mockGetEnabledActions).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })

    test('should handle error when creating compatibility matrix fails', async () => {
      const compatibilityError = new Error(
        'Failed to create compatibility matrix'
      )
      mockCreateCompatibilityMatrix.mockRejectedValue(compatibilityError)

      await expect(
        validateApplication(
          mockLandAction,
          mockApplicationId,
          mockCrn,
          mockSbi,
          mockRequesterUsername,
          mockRequest
        )
      ).rejects.toThrow('Failed to create compatibility matrix')

      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })

    test('should handle error when validating land parcel actions fails', async () => {
      const validationError = new Error('Land parcel validation failed')
      mockValidateLandParcelActions.mockRejectedValue(validationError)

      await expect(
        validateApplication(
          mockLandAction,
          mockApplicationId,
          mockCrn,
          mockSbi,
          mockRequesterUsername,
          mockRequest
        )
      ).rejects.toThrow('Land parcel validation failed')
    })

    test('should handle error when saving application fails', async () => {
      mockValidateLandParcelActions
        .mockResolvedValueOnce(mockParcelResults[0])
        .mockResolvedValueOnce(mockParcelResults[1])

      const saveError = new Error('Failed to save application')
      mockSaveApplication.mockRejectedValue(saveError)

      await expect(
        validateApplication(
          mockLandAction,
          mockApplicationId,
          mockCrn,
          mockSbi,
          mockRequesterUsername,
          mockRequest
        )
      ).rejects.toThrow('Failed to save application')

      expect(mockSaveApplication).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb,
        {
          applicationId: mockApplicationId,
          sbi: mockSbi,
          crn: mockCrn,
          data: mockApplicationData
        }
      )
    })
  })
})
