import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { validateActionOnParcel } from './action-validation.service.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'

vi.mock('./action-validation.service.js')

const mockValidateActionOnParcel = validateActionOnParcel

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

    mockValidateActionOnParcel.mockResolvedValue(mockActionResult1)
  })

  describe('validateLandParcelActions', () => {
    test('should successfully validate land parcel actions', async () => {
      mockValidateActionOnParcel
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

      expect(mockValidateActionOnParcel).toHaveBeenCalledTimes(2)
      expect(mockValidateActionOnParcel).toHaveBeenNthCalledWith(
        1,
        mockLandAction.actions[0],
        mockActions,
        agreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
      expect(mockValidateActionOnParcel).toHaveBeenNthCalledWith(
        2,
        mockLandAction.actions[1],
        mockActions,
        agreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )
    })

    describe('supplements', () => {
      const supplementLandAction = {
        sheetId,
        parcelId,
        actions: [
          { code: 'CLIG3_26', quantity: 10 },
          { code: 'GRH7_26', quantity: 6 },
          { code: 'GRH8_26', quantity: 5 }
        ]
      }
      const supplementActions = ['CLIG3_26', 'GRH7_26', 'GRH8_26'].map(
        (code) => ({ code, applicationUnitOfMeasurement: 'ha' })
      )
      const baseCodesBySupplement = new Map([
        ['GRH7_26', new Set(['CLIG3_26'])],
        ['GRH8_26', new Set(['CLIG3_26'])]
      ])
      const passed = (code) => ({
        hasPassed: true,
        code,
        rules: [
          { name: 'applied-for-total-or-partial-available-area', passed: true }
        ]
      })

      beforeEach(() => {
        mockValidateActionOnParcel.mockImplementation((action) =>
          Promise.resolve(passed(action.code))
        )
      })

      const validate = () =>
        validateLandParcelActions(
          supplementLandAction,
          supplementActions,
          () => false,
          mockRequest,
          agreements,
          baseCodesBySupplement
        )

      test('should add the supplement checks to each supplement', async () => {
        const { actions } = await validate()
        const ruleNames = (code) =>
          actions.find((a) => a.code === code).rules.map((r) => r.name)

        expect(ruleNames('GRH7_26')).toEqual([
          'applied-for-total-or-partial-available-area',
          'supplement-has-base-action',
          'supplement-within-base-action-area'
        ])
        expect(ruleNames('GRH8_26')).toEqual([
          'applied-for-total-or-partial-available-area',
          'supplement-has-base-action',
          'supplement-within-base-action-area'
        ])
      })

      test('should leave an action that is not a supplement as validated', async () => {
        const { actions } = await validate()

        expect(actions.find((a) => a.code === 'CLIG3_26')).toEqual(
          passed('CLIG3_26')
        )
      })

      test('should fail a supplement whose check fails', async () => {
        // GRH7_26 and GRH8_26 cannot stack, and 6 + 5 ha is over 10 ha of CLIG3_26
        const { actions } = await validate()

        expect(actions.find((a) => a.code === 'GRH7_26').hasPassed).toBe(false)
        expect(actions.find((a) => a.code === 'GRH8_26').hasPassed).toBe(false)
      })

      test('should keep a supplement failed when its own rules fail, even if its checks pass', async () => {
        mockValidateActionOnParcel.mockImplementation((action) =>
          Promise.resolve({ ...passed(action.code), hasPassed: false })
        )

        const { actions } = await validateLandParcelActions(
          {
            ...supplementLandAction,
            actions: supplementLandAction.actions.slice(0, 2)
          },
          supplementActions,
          () => false,
          mockRequest,
          agreements,
          baseCodesBySupplement
        )

        expect(actions.find((a) => a.code === 'GRH7_26').hasPassed).toBe(false)
      })
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
