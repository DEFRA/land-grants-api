import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { validateLandAction } from './action-validation.service.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { vi } from 'vitest'

vi.mock('../../agreements/queries/getAgreementsForParcel.query.js')
vi.mock('./action-validation.service.js')

const mockGetAgreementsForParcel = getAgreementsForParcel
const mockValidateLandAction = validateLandAction

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

  const mockAgreements = [
    {
      code: 'LIG2',
      area: 100
    }
  ]

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

    mockGetAgreementsForParcel.mockResolvedValue(mockAgreements)
    mockValidateLandAction.mockResolvedValue(mockActionResult1)
  })

  describe('validateLandParcelActions', () => {
    test('should successfully validate land parcel actions', async () => {
      mockValidateLandAction
        .mockResolvedValueOnce(mockActionResult1)
        .mockResolvedValueOnce(mockActionResult2)

      const result = await validateLandParcelActions(
        mockLandAction,
        mockActions,
        mockCompatibilityCheckFn,
        mockRequest
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

      expect(mockValidateLandAction).toHaveBeenCalledTimes(2)
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        1,
        mockLandAction.actions[0],
        mockActions,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        2,
        mockLandAction.actions[1],
        mockActions,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
    })

    test('should throw error when landAction is null', async () => {
      await expect(
        validateLandParcelActions(
          null,
          mockActions,
          mockCompatibilityCheckFn,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when actions is null', async () => {
      await expect(
        validateLandParcelActions(
          mockLandAction,
          null,
          mockCompatibilityCheckFn,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when compatibilityCheckFn is null', async () => {
      await expect(
        validateLandParcelActions(
          mockLandAction,
          mockActions,
          null,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should handle database errors when fetching agreements', async () => {
      const dbError = new Error('Database connection failed')
      mockGetAgreementsForParcel.mockRejectedValue(dbError)

      await expect(
        validateLandParcelActions(
          mockLandAction,
          mockActions,
          mockCompatibilityCheckFn,
          mockRequest
        )
      ).rejects.toThrow('Database connection failed')

      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
    })
  })
})
