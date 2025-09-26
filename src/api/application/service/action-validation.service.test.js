import { validateLandAction } from './action-validation.service.js'
import { mockActionConfig } from '~/src/api/actions/fixtures/index.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { plannedActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'
import {
  actionResultTransformer,
  ruleEngineApplicationTransformer
} from '../transformers/application.transformer.js'

jest.mock('~/src/api/parcel/queries/getMoorlandInterceptPercentage.js')
jest.mock('~/src/available-area/availableArea.js')
jest.mock('~/src/rules-engine/rulesEngine.js')
jest.mock('../../parcel/transformers/parcelActions.transformer.js')
jest.mock('../transformers/application.transformer.js')

const mockGetMoorlandInterceptPercentage = getMoorlandInterceptPercentage
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockGetAvailableAreaForAction = getAvailableAreaForAction
const mockExecuteRules = executeRules
const mockPlannedActionsTransformer = plannedActionsTransformer
const mockActionResultTransformer = actionResultTransformer
const mockRuleEngineApplicationTransformer = ruleEngineApplicationTransformer

describe('Action Validation Service', () => {
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

  const mockCompatibilityCheckFn = jest.fn()

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
    jest.clearAllMocks()

    mockGetAvailableAreaDataRequirements.mockResolvedValue(
      mockAvailableAreaDataRequirements
    )
    mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
    mockGetMoorlandInterceptPercentage.mockResolvedValue(50)
    mockPlannedActionsTransformer.mockReturnValue([])
    mockRuleEngineApplicationTransformer.mockReturnValue({
      areaAppliedFor: 10,
      actionCodeAppliedFor: 'CMOR1',
      landParcel: {
        area: 0.1,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: 50 }
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
