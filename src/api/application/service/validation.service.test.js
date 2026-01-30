import { vi } from 'vitest'
import Boom from '@hapi/boom'
import {
  validateRequestData,
  validateAllLandParcels
} from './validation.service.js'
import { validateRequest } from '../validation/application.validation.js'
import { logValidationWarn } from '~/src/api/common/helpers/logging/log-helpers.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'

vi.mock('../validation/application.validation.js')
vi.mock('~/src/api/common/helpers/logging/log-helpers.js')
vi.mock('~/src/available-area/compatibilityMatrix.js')
vi.mock('./land-parcel-validation.service.js')

const mockValidateRequest = vi.mocked(validateRequest)
const mockLogValidationWarn = vi.mocked(logValidationWarn)
const mockCreateCompatibilityMatrix = vi.mocked(createCompatibilityMatrix)
const mockValidateLandParcelActions = vi.mocked(validateLandParcelActions)

describe('Validation Service', () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }

  const mockRequest = {
    logger: mockLogger
  }

  const mockLandActions = [
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

  const mockActions = [
    {
      code: 'CMOR1',
      name: 'Create and restore moorland',
      version: '1'
    }
  ]

  const mockApplicationId = 'APP-123456'
  const mockSbi = '123456789'

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRequestData', () => {
    test('should return null when validation passes with no errors', async () => {
      mockValidateRequest.mockResolvedValue(null)

      const result = await validateRequestData(mockRequest, {
        landActions: mockLandActions,
        actions: mockActions,
        applicationId: mockApplicationId,
        sbi: mockSbi
      })

      expect(result).toBeNull()
      expect(mockValidateRequest).toHaveBeenCalledWith(
        mockLandActions,
        mockActions,
        mockRequest
      )
      expect(mockLogValidationWarn).not.toHaveBeenCalled()
    })

    test('should return a bad request response when validation fails', async () => {
      mockValidateRequest.mockResolvedValue(['Invalid land action data'])

      const result = await validateRequestData(mockRequest, {
        landActions: mockLandActions,
        actions: mockActions,
        applicationId: mockApplicationId,
        sbi: mockSbi
      })

      expect(result).toEqual(Boom.badRequest('Invalid land action data'))
      expect(mockValidateRequest).toHaveBeenCalledWith(
        mockLandActions,
        mockActions,
        mockRequest
      )
      expect(mockLogValidationWarn).toHaveBeenCalled()
    })
  })

  describe('validateAllLandParcels', () => {
    test('should return an array of parcel results when validation passes', async () => {
      const mockParcelResult1 = { sheetId: 'SX0679', parcelId: '9238' }
      const mockParcelResult2 = { sheetId: 'SX0680', parcelId: '9239' }
      const mockLandActionsForTest = [
        { sheetId: 'SX0679', parcelId: '9238', actions: [] },
        { sheetId: 'SX0680', parcelId: '9239', actions: [] }
      ]
      const mockCompatibilityCheckFn = vi.fn()
      mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
      mockValidateLandParcelActions
        .mockResolvedValueOnce(mockParcelResult1)
        .mockResolvedValueOnce(mockParcelResult2)

      const result = await validateAllLandParcels(mockRequest, mockPostgresDb, {
        landActions: mockLandActionsForTest,
        actions: mockActions
      })

      expect(result).toEqual([mockParcelResult1, mockParcelResult2])
      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
      expect(mockValidateLandParcelActions).toHaveBeenCalledTimes(2)
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        1,
        mockLandActionsForTest[0],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest
      )
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        2,
        mockLandActionsForTest[1],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest
      )
    })
  })
})
