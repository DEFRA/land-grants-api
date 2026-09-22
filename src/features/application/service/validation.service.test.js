import Boom from '@hapi/boom'

import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { logValidationWarn } from '~/src/features/common/helpers/logging/log-helpers.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { validateRequest } from '../validation/application.validation.js'
import {
  validateRequestData,
  validateAllLandParcels
} from './validation.service.js'

vi.mock('../validation/application.validation.js')
vi.mock('./land-parcel-validation.service.js')
vi.mock('~/src/features/agreements/repo.js')
vi.mock('~/src/features/available-area/compatibilityMatrix.js')
vi.mock('~/src/features/common/helpers/logging/log-helpers.js')

const fullParcelId = '9238-SX0679'

const mockValidateRequest = vi.mocked(validateRequest)
const mockLogValidationWarn = vi.mocked(logValidationWarn)
const mockCreateCompatibilityMatrix = vi.mocked(createCompatibilityMatrix)
const mockValidateLandParcelActions = vi.mocked(validateLandParcelActions)

describe('Validation Service', () => {
  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

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

  const agreements = {
    '9238-SX0679': [
      {
        actionCode: 'CMOR1',
        quantity: 15000,
        unit: 'sqm',
        startDate: new Date('2000-01-01'),
        endDate: new Date('2200-01-01')
      }
    ],
    '9239-SX0680': []
  }

  const mockApplicationId = 'APP-123456'
  const mockSbi = '123456789'

  beforeEach(() => {
    vi.clearAllMocks()

    getAgreements.mockResolvedValue(agreements)
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
      const sbi = '012345678'
      const defraIdToken = 'dummy'
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

      const result = await validateAllLandParcels(
        mockRequest,
        mockPostgresDb,
        sbi,
        defraIdToken,
        {
          landActions: mockLandActionsForTest,
          actions: mockActions
        }
      )

      expect(result).toEqual([mockParcelResult1, mockParcelResult2])
      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
      expect(getAgreements).toHaveBeenCalledWith(
        sbi,
        [
          ['9238', 'SX0679'],
          ['9239', 'SX0680']
        ],
        defraIdToken,
        mockPostgresDb,
        mockLogger
      )
      expect(mockValidateLandParcelActions).toHaveBeenCalledTimes(2)
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        1,
        mockLandActionsForTest[0],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest,
        agreements[fullParcelId]
      )
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        2,
        mockLandActionsForTest[1],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest,
        agreements['9239-SX0680']
      )
    })

    test('should provide an empty array of agreements if none were found', async () => {
      const sbi = '012345678'
      const defraIdToken = 'dummy'
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

      getAgreements.mockResolvedValue({})

      const result = await validateAllLandParcels(
        mockRequest,
        mockPostgresDb,
        sbi,
        defraIdToken,
        {
          landActions: mockLandActionsForTest,
          actions: mockActions
        }
      )

      expect(result).toEqual([mockParcelResult1, mockParcelResult2])
      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
      expect(getAgreements).toHaveBeenCalledWith(
        sbi,
        [
          ['9238', 'SX0679'],
          ['9239', 'SX0680']
        ],
        defraIdToken,
        mockPostgresDb,
        mockLogger
      )
      expect(mockValidateLandParcelActions).toHaveBeenCalledTimes(2)
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        1,
        mockLandActionsForTest[0],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )
      expect(mockValidateLandParcelActions).toHaveBeenNthCalledWith(
        2,
        mockLandActionsForTest[1],
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )
    })
  })
})
