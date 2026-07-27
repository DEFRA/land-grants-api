import { vi } from 'vitest'

import { getAgreements } from '~/src/services/dal/index.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { validateLandAction } from './action-validation.service.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'

vi.mock('../../agreements/queries/getAgreementsForParcel.query.js')
vi.mock('~/src/services/dal/index.js')
vi.mock('./action-validation.service.js')

const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAgreements = getAgreements
const mockValidateLandAction = validateLandAction

const sbi = '012345678'

describe('Land Parcel Validation Service', () => {
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn()
  }

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  const mockRequest = {
    headers: { 'x-forwarded-authorization': 'dummy-token' },
    logger: mockLogger,
    server: {
      postgresDb: mockPostgresDb
    }
  }

  const mockLandAction = {
    sheetId: 'SX0679',
    parcelId: '9238',
    actions: [
      {
        code: 'CMOR1',
        quantity: 10
      },
      {
        code: 'UPL1',
        quantity: 5
      }
    ]
  }

  const mockActions = mockActionConfig

  const mockCompatibilityCheckFn = vi.fn()

  const mockAgreementsDb = [
    {
      actionCode: 'CLIG2',
      quantity: 100,
      unit: 'sqm',
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2030-01-01T00:00:00Z')
    }
  ]
  const mockAgreementsDal = [
    {
      actionCode: 'CLIG2',
      quantity: 1000,
      unit: 'sqm',
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2030-01-01T00:00:00Z')
    }
  ]
  const mockAgreementsAll = [...mockAgreementsDb, ...mockAgreementsDal]

  const mockActionResult1 = {
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

  const mockActionResult2 = {
    hasPassed: false,
    code: 'UPL1',
    actionConfigVersion: '1',
    availableArea: {
      explanations: ['Insufficient area'],
      areaInHa: 0.05
    },
    rules: [
      {
        name: 'applied-for-total-available-area',
        passed: false,
        message: 'Insufficient area available'
      }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAgreementsForParcel.mockResolvedValue(mockAgreementsDb)
    mockGetAgreements.mockResolvedValue(mockAgreementsDal)
    mockValidateLandAction.mockResolvedValue(mockActionResult1)
  })

  describe('validateLandParcelActions', () => {
    test('should successfully validate land parcel actions', async () => {
      mockValidateLandAction
        .mockResolvedValueOnce(mockActionResult1)
        .mockResolvedValueOnce(mockActionResult2)

      const result = await validateLandParcelActions(
        sbi,
        mockLandAction,
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest,
        'dummy-token'
      )

      expect(result).toEqual({
        sheetId: 'SX0679',
        parcelId: '9238',
        actions: [mockActionResult1, mockActionResult2]
      })

      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetAgreements).toHaveBeenCalledWith(
        sbi,
        mockLandAction.parcelId,
        mockLandAction.sheetId,
        'dummy-token',
        mockLogger
      )

      expect(mockValidateLandAction).toHaveBeenCalledTimes(2)
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        1,
        mockLandAction.actions[0],
        mockActions,
        mockAgreementsAll,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        2,
        mockLandAction.actions[1],
        mockActions,
        mockAgreementsAll,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
    })

    test('should throw error when landAction is null', async () => {
      await expect(
        validateLandParcelActions(
          sbi,
          null,
          mockActions,
          mockCompatibilityCheckFn,
          mockRequest,
          'dummy-token'
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when actions is null', async () => {
      await expect(
        validateLandParcelActions(
          sbi,
          mockLandAction,
          null,
          mockCompatibilityCheckFn,
          mockRequest,
          'dummy-token'
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when compatibilityCheckFn is null', async () => {
      await expect(
        validateLandParcelActions(
          sbi,
          mockLandAction,
          mockActions,
          null,
          mockRequest,
          'dummy-token'
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should fail if database error occurs when fetching agreements', async () => {
      const dbError = new Error('Database connection failed')
      mockGetAgreementsForParcel.mockRejectedValue(dbError)

      await expect(
        validateLandParcelActions(
          sbi,
          mockLandAction,
          mockActions,
          mockCompatibilityCheckFn,
          mockRequest,
          'dummy-token'
        )
      ).rejects.toThrow()

      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetAgreements).toHaveBeenCalledWith(
        sbi,
        mockLandAction.parcelId,
        mockLandAction.sheetId,
        'dummy-token',
        mockLogger
      )
    })

    test('should fail if fetching agreements from DAL fails', async () => {
      const err = new Error('DAL request failed')
      mockGetAgreements.mockRejectedValue(err)

      await expect(
        validateLandParcelActions(
          sbi,
          mockLandAction,
          mockActions,
          mockCompatibilityCheckFn,
          mockRequest,
          'dummy-token'
        )
      ).rejects.toThrow()

      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetAgreements).toHaveBeenCalledWith(
        sbi,
        mockLandAction.parcelId,
        mockLandAction.sheetId,
        'dummy-token',
        mockLogger
      )
    })
  })
})
