import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { validateLandAction } from './action-validation.service.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'

vi.mock('./action-validation.service.js')

const mockValidateLandAction = validateLandAction

const parcelId = '9238'
const sheetId = 'SX0679'

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
    sheetId,
    parcelId,
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

  const agreements = [
    {
      actionCode: 'CLIG2',
      quantity: 100,
      unit: 'sqm',
      startDate: new Date('2020-01-01T00:00:00Z'),
      endDate: new Date('2030-01-01T00:00:00Z')
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
        mockRequest,
        agreements
      )

      expect(result).toEqual({
        sheetId: 'SX0679',
        parcelId: '9238',
        actions: [mockActionResult1, mockActionResult2]
      })

      expect(mockValidateLandAction).toHaveBeenCalledTimes(2)
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        1,
        mockLandAction.actions[0],
        mockActions,
        agreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
      expect(mockValidateLandAction).toHaveBeenNthCalledWith(
        2,
        mockLandAction.actions[1],
        mockActions,
        agreements,
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
          mockRequest,
          agreements
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when actions is null', async () => {
      await expect(
        validateLandParcelActions(
          mockLandAction,
          null,
          mockCompatibilityCheckFn,
          mockRequest,
          agreements
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })

    test('should throw error when compatibilityCheckFn is null', async () => {
      await expect(
        validateLandParcelActions(
          mockLandAction,
          mockActions,
          null,
          mockRequest,
          agreements
        )
      ).rejects.toThrow('Unable to validate land parcel actions')
    })
  })
})
