import { validateLandAction } from './action-validation.service.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import { resolveApplicationData } from '~/src/features/rules-engine/services/resolveApplicationData.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'
import { doNotFitSection } from '~/src/features/available-length/explanations.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'

vi.mock('~/src/features/rules-engine/rulesEngine.js', () => ({
  executeRules: vi.fn()
}))
vi.mock(
  '~/src/features/application/transformers/application.transformer.js',
  () => ({
    actionResultTransformer: vi.fn()
  })
)
vi.mock(
  '~/src/features/rules-engine/services/resolveApplicationData.js',
  () => ({
    resolveApplicationData: vi.fn()
  })
)

vi.mock('~/src/features/available-length/availableLength.js')

const mockExecuteRules = vi.mocked(executeRules)
const mockActionResultTransformer = vi.mocked(actionResultTransformer)
const mockResolveApplicationData = vi.mocked(resolveApplicationData)

describe('Action Validation Service', () => {
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

  const mockAction = {
    code: 'CMOR1',
    quantity: 10.5
  }

  const mockLandAction = {
    sheetId: 'SX0679',
    parcelId: '9238',
    actions: [mockAction]
  }

  const mockAgreements = [
    {
      code: 'LIG2',
      area: 100
    }
  ]

  const mockCompatibilityCheckFn = vi.fn()

  const mockResolvedApplication = {
    appliedForQuantity: 10.5,
    applicationUnitOfMeasurement: 'ha',
    actionCodeAppliedFor: 'CMOR1',
    landParcel: {
      existingAgreements: mockAgreements,
      intersections: {
        moorland: { intersectingAreaPercentage: 50 }
      }
    }
  }

  const mockRuleResult = {
    passed: true,
    results: [
      {
        name: 'parcel-has-intersection-with-data-layer',
        passed: true,
        message: 'Success'
      }
    ]
  }

  const mockActionResult = {
    hasPassed: true,
    code: 'CMOR1',
    actionConfigVersion: '1',
    availableArea: null,
    rules: [mockRuleResult.results]
  }

  const cmor1Config = mockActionConfig.find((a) => a.code === 'CMOR1')

  beforeEach(() => {
    vi.clearAllMocks()

    mockResolveApplicationData.mockResolvedValue(mockResolvedApplication)
    mockExecuteRules.mockReturnValue(mockRuleResult)
    mockActionResultTransformer.mockReturnValue(mockActionResult)
  })

  describe('validateLandAction', () => {
    test('should successfully validate a land action', async () => {
      const result = await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      expect(result).toEqual(mockActionResult)
      expect(mockActionResultTransformer).toHaveBeenCalledWith({
        action: mockAction,
        actions: mockActionConfig,
        availableArea: null,
        ruleResult: mockRuleResult
      })
    })

    test('should resolve application data using the rules configured for the action', async () => {
      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      expect(mockResolveApplicationData).toHaveBeenCalledTimes(1)
      expect(mockResolveApplicationData).toHaveBeenCalledWith(
        cmor1Config.rules,
        {
          appliedForQuantity: 10.5,
          applicationUnitOfMeasurement: 'ha',
          actionCodeAppliedFor: 'CMOR1',
          landParcel: {
            existingAgreements: mockAgreements
          }
        },
        {
          action: mockAction,
          actions: mockActionConfig,
          landAction: mockLandAction,
          agreements: mockAgreements,
          compatibilityCheckFn: mockCompatibilityCheckFn,
          unit: 'ha',
          appliedForQuantity: 10.5,
          db: mockPostgresDb,
          logger: mockLogger
        }
      )
    })

    test('should execute the action rules against the resolved application', async () => {
      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      expect(mockExecuteRules).toHaveBeenCalledWith(
        rules,
        {
          ...mockResolvedApplication,
          parcelId: mockLandAction.parcelId,
          sheetId: mockLandAction.sheetId,
          actionCode: mockAction.code
        },
        cmor1Config.rules
      )
    })

    test('should keep a fractional quantity for area-based actions', async () => {
      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      const [, baseApplication, ctx] = mockResolveApplicationData.mock.calls[0]
      expect(baseApplication.appliedForQuantity).toBe(10.5)
      expect(ctx.appliedForQuantity).toBe(10.5)
    })

    test('should keep a fractional quantity for sqm actions', async () => {
      const sqmAction = { code: 'HEF1', quantity: 150.4 }
      const actionConfigWithHef1 = [
        ...mockActionConfig,
        { code: 'HEF1', applicationUnitOfMeasurement: 'sqm', rules: [] }
      ]

      await validateLandAction(
        sqmAction,
        actionConfigWithHef1,
        mockAgreements,
        mockCompatibilityCheckFn,
        { ...mockLandAction, actions: [sqmAction] },
        mockRequest
      )

      const [, baseApplication] = mockResolveApplicationData.mock.calls[0]
      expect(baseApplication).toMatchObject({
        appliedForQuantity: 150.4,
        applicationUnitOfMeasurement: 'sqm'
      })
    })

    test('should round the quantity for meter-based actions', async () => {
      const meterAction = { code: 'BND1', quantity: 150.6 }
      const actionConfigWithBnd1 = [
        ...mockActionConfig,
        { code: 'BND1', applicationUnitOfMeasurement: 'm', rules: [] }
      ]

      await validateLandAction(
        meterAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        { ...mockLandAction, actions: [meterAction] },
        mockRequest
      )

      const [, baseApplication, ctx] = mockResolveApplicationData.mock.calls[0]
      expect(baseApplication).toMatchObject({
        appliedForQuantity: 151,
        applicationUnitOfMeasurement: 'm',
        actionCodeAppliedFor: 'BND1'
      })
      expect(ctx).toMatchObject({ unit: 'm', appliedForQuantity: 151 })
    })

    test('should round the quantity for count-based actions', async () => {
      const countAction = { code: 'WBD1', quantity: 2.4 }

      await validateLandAction(
        countAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        { ...mockLandAction, actions: [countAction] },
        mockRequest
      )

      const [, baseApplication] = mockResolveApplicationData.mock.calls[0]
      expect(baseApplication).toMatchObject({
        appliedForQuantity: 2,
        applicationUnitOfMeasurement: 'count'
      })
    })

    test('should pass undefined unit and empty rules when the action config is not found', async () => {
      const unknownAction = { code: 'UNKNOWN1', quantity: 3.7 }

      await validateLandAction(
        unknownAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        { ...mockLandAction, actions: [unknownAction] },
        mockRequest
      )

      const [actionRules, baseApplication] =
        mockResolveApplicationData.mock.calls[0]
      expect(actionRules).toEqual([])
      expect(baseApplication).toMatchObject({
        appliedForQuantity: 4,
        applicationUnitOfMeasurement: undefined,
        actionCodeAppliedFor: 'UNKNOWN1'
      })
      expect(mockExecuteRules.mock.calls[0][2]).toBeUndefined()
    })

    test('should default existingAgreements to an empty array when agreements are not supplied', async () => {
      await validateLandAction(
        mockAction,
        mockActionConfig,
        undefined,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      const [, baseApplication] = mockResolveApplicationData.mock.calls[0]
      expect(baseApplication.landParcel).toEqual({ existingAgreements: [] })
    })

    test('should throw error when landAction is null', async () => {
      await expect(
        validateLandAction(
          mockAction,
          mockActionConfig,
          mockAgreements,
          mockCompatibilityCheckFn,
          null,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land action')
      expect(mockResolveApplicationData).not.toHaveBeenCalled()
    })

    test('should throw error when actions is null', async () => {
      await expect(
        validateLandAction(
          mockAction,
          null,
          mockAgreements,
          mockCompatibilityCheckFn,
          mockLandAction,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land action')
    })

    test('should throw error when compatibilityCheckFn is null', async () => {
      await expect(
        validateLandAction(
          mockAction,
          mockActionConfig,
          mockAgreements,
          null,
          mockLandAction,
          mockRequest
        )
      ).rejects.toThrow('Unable to validate land action')
    })

    test('should propagate errors from resolving application data', async () => {
      mockResolveApplicationData.mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        validateLandAction(
          mockAction,
          mockActionConfig,
          mockAgreements,
          mockCompatibilityCheckFn,
          mockLandAction,
          mockRequest
        )
      ).rejects.toThrow('Database connection failed')
      expect(mockExecuteRules).not.toHaveBeenCalled()
    })
  })

  describe('validateLandAction for a linear action', () => {
    const linearAction = { code: 'BND1', quantity: 100 }
    const linearLandAction = { ...mockLandAction, actions: [linearAction] }
    const actionConfigWithBnd1 = [
      ...mockActionConfig,
      { code: 'BND1', applicationUnitOfMeasurement: 'm', rules: [] }
    ]

    const availableLengthOf = ({
      availableLength,
      feasible,
      incompatibleLengthMeters = 500 - availableLength
    }) => ({
      availableLength,
      boundaryLengthMeters: 500,
      incompatibleLengthMeters,
      incompatibleActions: [],
      feasible,
      explainedOccupancies: []
    })

    test('should report only that existing actions do not fit when they cannot all fit the boundary', async () => {
      const availableLength = availableLengthOf({
        availableLength: 0,
        feasible: false,
        incompatibleLengthMeters: 600
      })
      vi.mocked(getAvailableLength).mockResolvedValue(availableLength)

      await validateLandAction(
        linearAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        linearLandAction,
        mockRequest
      )

      const [{ ruleResult }] = mockActionResultTransformer.mock.calls[0]
      const { title, content } = doNotFitSection(availableLength)
      expect(ruleResult).toEqual({
        passed: false,
        results: [
          {
            name: EXISTING_ACTIONS_DO_NOT_FIT,
            passed: false,
            description: expect.any(String),
            reason: EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
            explanations: [{ title, lines: content }]
          }
        ]
      })
    })

    test('should check the rules against the available length worked out for the action', async () => {
      const availableLength = availableLengthOf({
        availableLength: 300,
        feasible: true
      })
      vi.mocked(getAvailableLength).mockResolvedValue(availableLength)

      await validateLandAction(
        linearAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        linearLandAction,
        mockRequest
      )

      const [, , ctx] = mockResolveApplicationData.mock.calls[0]
      expect(ctx.availableLength).toBe(availableLength)
    })

    test('should carry the available length to the action result, so a caseworker can see how it was worked out', async () => {
      const availableLength = availableLengthOf({
        availableLength: 300,
        feasible: true
      })
      vi.mocked(getAvailableLength).mockResolvedValue(availableLength)

      await validateLandAction(
        linearAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        linearLandAction,
        mockRequest
      )

      const [transformed] = mockActionResultTransformer.mock.calls[0]
      expect(transformed.availableLength).toBe(availableLength)
    })

    test('should carry the available length to the action result when the existing actions do not fit', async () => {
      const availableLength = availableLengthOf({
        availableLength: 0,
        feasible: false,
        incompatibleLengthMeters: 600
      })
      vi.mocked(getAvailableLength).mockResolvedValue(availableLength)

      await validateLandAction(
        linearAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        linearLandAction,
        mockRequest
      )

      const [transformed] = mockActionResultTransformer.mock.calls[0]
      expect(transformed.availableLength).toBe(availableLength)
    })

    test('should fail when the parcel boundary cannot be read', async () => {
      vi.mocked(getAvailableLength).mockRejectedValue(
        new Error('Unable to read the boundary of land parcel SX0679-9238')
      )

      const validation = validateLandAction(
        linearAction,
        actionConfigWithBnd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        linearLandAction,
        mockRequest
      )

      await expect(validation).rejects.toThrow(
        'Unable to read the boundary of land parcel SX0679-9238'
      )
    })

    test('should not work out an available length for an area action', async () => {
      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        mockLandAction,
        mockRequest
      )

      expect(getAvailableLength).not.toHaveBeenCalled()
    })
  })
})
