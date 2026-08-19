import { vi } from 'vitest'
import { validateLandAction } from './action-validation.service.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import { getLfaInterceptPercentage } from '~/src/features/parcel/queries/getLfaInterceptPercentage.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { plannedActionsTransformer } from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'

vi.mock(
  '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js',
  () => ({
    getMoorlandInterceptPercentage: vi.fn()
  })
)
vi.mock('~/src/features/parcel/queries/getLfaInterceptPercentage.js', () => ({
  getLfaInterceptPercentage: vi.fn()
}))
vi.mock(
  '~/src/features/available-area/availableAreaDataRequirements.js',
  () => ({
    getAvailableAreaDataRequirements: vi.fn()
  })
)
vi.mock(
  '~/src/features/available-area/availableArea.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      findMaximumAvailableArea: vi.fn()
    }
  }
)
vi.mock('~/src/features/available-area/explanations.js', () => ({
  formatExplanationSections: vi.fn()
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
    actionResultTransformer: vi.fn()
  })
)
vi.mock(
  '~/src/features/data-layers/queries/getDataLayer.query.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      getDataLayerQueryAccumulated: vi.fn(),
      getDataLayerQueryUnion: vi.fn()
    }
  }
)

const mockGetMoorlandInterceptPercentage = vi.mocked(
  getMoorlandInterceptPercentage
)
const mockGetLfaInterceptPercentage = vi.mocked(getLfaInterceptPercentage)
const mockGetAvailableAreaDataRequirements = vi.mocked(
  getAvailableAreaDataRequirements
)
const mockFindMaximumAvailableArea = vi.mocked(findMaximumAvailableArea)
const mockFormatExplanationSections = vi.mocked(formatExplanationSections)
const mockExecuteRules = vi.mocked(executeRules)
const mockPlannedActionsTransformer = vi.mocked(plannedActionsTransformer)
const mockActionResultTransformer = vi.mocked(actionResultTransformer)
const mockGetDataLayerQueryAccumulated = vi.mocked(getDataLayerQueryAccumulated)
const mockGetDataLayerQueryUnion = vi.mocked(getDataLayerQueryUnion)

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

  const mockAvailableAreaDataRequirements = {
    landCoverCodesForAppliedForAction: ['130', '240'],
    landCoversForParcel: [],
    landCoversForExistingActions: [],
    landCoverToString: vi.fn()
  }

  const mockLpResult = {
    feasible: true,
    context: null,
    totalValidLandCoverSqm: 1000,
    availableAreaSqm: 1000,
    availableAreaHectares: 0.1
  }

  const mockAvailableAreaResult = {
    ...mockLpResult,
    explanations: ['Area calculation successful']
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
    mockFindMaximumAvailableArea.mockReturnValue(mockLpResult)
    mockFormatExplanationSections.mockReturnValue([
      'Area calculation successful'
    ])
    mockGetMoorlandInterceptPercentage.mockResolvedValue(50)
    mockGetLfaInterceptPercentage.mockResolvedValue(100)
    mockGetDataLayerQueryAccumulated.mockResolvedValue({
      intersectingAreaPercentage: 15.5,
      intersectionAreaHa: 0.1
    })
    mockGetDataLayerQueryUnion.mockResolvedValue({
      intersectingAreaPercentage: 15.5,
      intersectionAreaHa: 0.1
    })
    mockPlannedActionsTransformer.mockReturnValue([])
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
      expect(mockFindMaximumAvailableArea).toHaveBeenCalledWith(
        mockAction.code,
        [],
        mockCompatibilityCheckFn,
        mockAvailableAreaDataRequirements
      )
      expect(mockGetMoorlandInterceptPercentage).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetLfaInterceptPercentage).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetDataLayerQueryAccumulated).toHaveBeenCalledTimes(1)
      expect(mockGetDataLayerQueryAccumulated).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        DATA_LAYER_TYPES.sssi,
        mockPostgresDb,
        mockLogger
      )
      expect(mockGetDataLayerQueryUnion).toHaveBeenCalledTimes(1)
      expect(mockGetDataLayerQueryUnion).toHaveBeenCalledWith(
        mockLandAction.sheetId,
        mockLandAction.parcelId,
        DATA_LAYER_TYPES.historic_features,
        mockPostgresDb,
        mockLogger
      )
      expect(mockExecuteRules).toHaveBeenCalled()
      expect(mockActionResultTransformer).toHaveBeenCalledWith(
        mockAction,
        mockActionConfig,
        mockAvailableAreaResult,
        mockRuleResult
      )
    })

    test('should include other actions requested for the same parcel as existing area demand', async () => {
      const siblingAction = { code: 'UPL1', quantity: 5 }
      const landActionWithSiblings = {
        ...mockLandAction,
        actions: [mockAction, siblingAction]
      }
      mockPlannedActionsTransformer.mockReturnValue([
        { actionCode: 'LIG2', areaSqm: 1000000 }
      ])

      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        landActionWithSiblings,
        mockRequest
      )

      const expectedExistingActions = [
        { actionCode: 'LIG2', areaSqm: 1000000 },
        { actionCode: 'UPL1', areaSqm: 50000 }
      ]

      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledWith(
        mockAction.code,
        landActionWithSiblings.sheetId,
        landActionWithSiblings.parcelId,
        expectedExistingActions,
        mockPostgresDb,
        mockLogger
      )
      expect(mockFindMaximumAvailableArea).toHaveBeenCalledWith(
        mockAction.code,
        expectedExistingActions,
        mockCompatibilityCheckFn,
        mockAvailableAreaDataRequirements
      )
    })

    test('should exclude a sibling action from existing area demand when its applicationUnitOfMeasurement is not hectares', async () => {
      const countBasedSiblingAction = { code: 'WBD1', quantity: 5 }
      const landActionWithSiblings = {
        ...mockLandAction,
        actions: [mockAction, countBasedSiblingAction]
      }
      const actionConfigWithWbd1 = [
        ...mockActionConfig,
        {
          code: 'WBD1',
          applicationUnitOfMeasurement: 'count'
        }
      ]
      mockPlannedActionsTransformer.mockReturnValue([
        { actionCode: 'LIG2', areaSqm: 1000000 }
      ])

      await validateLandAction(
        mockAction,
        actionConfigWithWbd1,
        mockAgreements,
        mockCompatibilityCheckFn,
        landActionWithSiblings,
        mockRequest
      )

      const expectedExistingActions = [{ actionCode: 'LIG2', areaSqm: 1000000 }]

      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledWith(
        mockAction.code,
        landActionWithSiblings.sheetId,
        landActionWithSiblings.parcelId,
        expectedExistingActions,
        mockPostgresDb,
        mockLogger
      )
      expect(mockFindMaximumAvailableArea).toHaveBeenCalledWith(
        mockAction.code,
        expectedExistingActions,
        mockCompatibilityCheckFn,
        mockAvailableAreaDataRequirements
      )
    })

    test('should include a sibling action as area demand when its action config is not found', async () => {
      const unknownSiblingAction = { code: 'UNKNOWN1', quantity: 5 }
      const landActionWithSiblings = {
        ...mockLandAction,
        actions: [mockAction, unknownSiblingAction]
      }
      mockPlannedActionsTransformer.mockReturnValue([])

      await validateLandAction(
        mockAction,
        mockActionConfig,
        mockAgreements,
        mockCompatibilityCheckFn,
        landActionWithSiblings,
        mockRequest
      )

      const expectedExistingActions = [
        { actionCode: 'UNKNOWN1', areaSqm: 50000 }
      ]

      expect(mockFindMaximumAvailableArea).toHaveBeenCalledWith(
        mockAction.code,
        expectedExistingActions,
        mockCompatibilityCheckFn,
        mockAvailableAreaDataRequirements
      )
    })

    test('should throw InfeasibleAreaError when AAC returns feasible: false', async () => {
      mockFindMaximumAvailableArea.mockReturnValue({
        feasible: false,
        availableAreaHectares: 0,
        availableAreaSqm: 0,
        totalValidLandCoverSqm: 1000,
        context: null
      })

      await expect(
        validateLandAction(
          mockAction,
          mockActionConfig,
          mockAgreements,
          mockCompatibilityCheckFn,
          mockLandAction,
          mockRequest
        )
      ).rejects.toThrow(
        "For land parcel SX0679-9238, there isn't enough land cover area for the existing actions. Please contact the RPA and give them this message."
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
