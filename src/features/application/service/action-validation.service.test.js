import { vi } from 'vitest'
import { validateLandAction } from './action-validation.service.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/features/available-area/availableArea.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { plannedActionsTransformer } from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import {
  actionResultTransformer,
  ruleEngineApplicationTransformer
} from '~/src/features/application/transformers/application.transformer.js'
import { getDataLayerQuery } from '~/src/features/data-layers/queries/getDataLayer.query.js'

vi.mock(
  '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js',
  () => ({
    getMoorlandInterceptPercentage: vi.fn()
  })
)
vi.mock('~/src/features/available-area/availableArea.js', () => ({
  getAvailableAreaDataRequirements: vi.fn(),
  getAvailableAreaForAction: vi.fn()
}))
vi.mock('~/src/features/rules-engine/rulesEngine.js', () => ({
  executeRules: vi.fn()
}))
vi.mock(
  '~/src/features/parcel/transformers/parcelActions.transformer.js',
  () => ({
    plannedActionsTransformer: vi.fn()
  })
)
vi.mock(
  '~/src/features/application/transformers/application.transformer.js',
  () => ({
    actionResultTransformer: vi.fn(),
    ruleEngineApplicationTransformer: vi.fn()
  })
)
vi.mock(
  '~/src/features/data-layers/queries/getDataLayer.query.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      getDataLayerQuery: vi.fn()
    }
  }
)

const mockGetMoorlandInterceptPercentage = vi.mocked(
  getMoorlandInterceptPercentage
)
const mockGetAvailableAreaDataRequirements = vi.mocked(
  getAvailableAreaDataRequirements
)
const mockGetAvailableAreaForAction = vi.mocked(getAvailableAreaForAction)
const mockExecuteRules = vi.mocked(executeRules)
const mockPlannedActionsTransformer = vi.mocked(plannedActionsTransformer)
const mockActionResultTransformer = vi.mocked(actionResultTransformer)
const mockRuleEngineApplicationTransformer = vi.mocked(
  ruleEngineApplicationTransformer
)
const mockGetDataLayerQuery = vi.mocked(getDataLayerQuery)

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
    quantity: 10
  }

  const mockLandAction = {
    sheetId: 'SX0679',
    parcelId: '9238'
  }

  const mockAgreements = [
    {
      code: 'LIG2',
      area: 100
    }
  ]

  const mockCompatibilityCheckFn = vi.fn()

  const mockAvailableAreaDataRequirements = {
    landCoverCodesForAppliedForAction: ['130', '240'],
    landCoversForParcel: [],
    landCoversForExistingActions: []
  }

  const mockAvailableAreaResult = {
    stacks: [],
    explanations: ['Area calculation successful'],
    totalValidLandCoverSqm: 1000,
    availableAreaSqm: 1000,
    availableAreaHectares: 0.1
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
    availableArea: {
      explanations: ['Area calculation successful'],
      areaInHa: 0.1
    },
    rules: [mockRuleResult.results]
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetAvailableAreaDataRequirements.mockResolvedValue(
      mockAvailableAreaDataRequirements
    )
    mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
    mockGetMoorlandInterceptPercentage.mockResolvedValue(50)
    mockGetDataLayerQuery.mockResolvedValue({
      intersectingAreaPercentage: 15.5,
      intersectionAreaHa: 0.1
    })
    mockPlannedActionsTransformer.mockReturnValue([])
    mockRuleEngineApplicationTransformer.mockReturnValue({
      areaAppliedFor: 10,
      actionCodeAppliedFor: 'CMOR1',
      landParcel: {
        area: 0.1,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: 50 },
          sssi: { intersectingAreaPercentage: 15.5 },
          historic_features: { intersectingAreaPercentage: 15.5 }
        }
      }
    })
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
      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledWith(
        mockAction.code,
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        [],
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetAvailableAreaForAction).toHaveBeenCalledWith(
        mockAction.code,
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockCompatibilityCheckFn,
        [],
        mockAvailableAreaDataRequirements,
        mockLogger
      )
      expect(mockGetMoorlandInterceptPercentage).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetDataLayerQuery).toHaveBeenCalledTimes(2)
      expect(mockGetDataLayerQuery).toHaveBeenNthCalledWith(
        1,
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        1,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetDataLayerQuery).toHaveBeenNthCalledWith(
        2,
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        3,
        mockPostgresDb,
        mockLogger
      )
      expect(mockRuleEngineApplicationTransformer).toHaveBeenCalledWith(
        mockAction.quantity,
        mockAction.code,
        expect.any(Number),
        50,
        { intersectingAreaPercentage: 15.5, intersectionAreaHa: 0.1 },
        { intersectingAreaPercentage: 15.5, intersectionAreaHa: 0.1 },
        mockAgreements
      )
      expect(mockExecuteRules).toHaveBeenCalled()
      expect(mockActionResultTransformer).toHaveBeenCalledWith(
        mockAction,
        mockActionConfig,
        mockAvailableAreaResult,
        mockRuleResult
      )
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

    test('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockGetAvailableAreaDataRequirements.mockRejectedValue(dbError)

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
    })
  })
})
