import {
  getActionsForParcel,
  getActionsForParcelWithSSSIConsentRequired,
  getActionsForParcelWithHEFERConsentRequired,
  splitParcelId
} from './parcel.service.js'
import {
  heferRequiredActionTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import {
  findMaximumAvailableArea,
  throwIfInfeasible
} from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { vi } from 'vitest'

vi.mock('~/src/features/parcel/transformers/parcelActions.transformer.js')
vi.mock('~/src/features/data-layers/queries/getDataLayer.query.js')
vi.mock('~/src/features/rules-engine/rulesEngine.js')
vi.mock('~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js')
vi.mock('~/src/features/available-area/availableArea.js')
vi.mock('~/src/features/available-area/explanations.js')
vi.mock('~/src/features/agreements/repo.js')
vi.mock('~/src/features/available-area/availableAreaDataRequirements.js')
vi.mock('~/src/features/agreements/transformers/agreements.transformer.js')

describe('Parcel Service 2.0.0', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn()
  }

  describe('splitParcelId', () => {
    test('should split valid parcel id into sheetId and parcelId', () => {
      const result = splitParcelId('SX0679-9238', mockLogger)
      expect(result).toEqual({
        sheetId: 'SX0679',
        parcelId: '9238'
      })
    })

    test('should throw error for invalid input', () => {
      expect(() => splitParcelId('SX0679-', mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })

    test('should throw error for empty input', () => {
      expect(() => splitParcelId(null, mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })
  })

  describe('getActionsForParcelWithSSSIConsentRequired', () => {
    let mockParcelIds
    let mockResponseParcels
    let mockEnabledActions
    let mockPostgresDb
    let mockDataLayerResult
    let mockSssiConsentRequiredAction
    let mockTransformedParcels

    beforeEach(() => {
      // Reset all mocks
      vi.clearAllMocks()

      // Setup test data
      mockParcelIds = ['SX0679-9238']

      mockResponseParcels = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          size: { unit: 'ha', value: 1.0 },
          actions: [
            {
              code: 'UPL1',
              description: 'Action 1',
              availableArea: { unit: 'ha', value: 0.5 }
            },
            {
              code: 'UPL2',
              description: 'Action 2',
              availableArea: { unit: 'ha', value: 0.3 }
            }
          ]
        }
      ]

      mockEnabledActions = [
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL1',
          description: 'Action 1',
          enabled: true,
          display: true,
          rules: [
            {
              name: 'sssi-consent-required',
              version: '1.0.0',
              config: {
                layerName: 'sssi',
                caveatDescription: 'A SSSI consent is required',
                tolerancePercent: 0
              }
            }
          ]
        },
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL2',
          description: 'Action 2',
          enabled: true,
          display: true,
          rules: [
            {
              name: 'sssi-consent-required',
              version: '1.0.0',
              config: {
                layerName: 'sssi',
                caveatDescription: 'A SSSI consent is required',
                tolerancePercent: 0
              }
            }
          ]
        }
      ]

      mockPostgresDb = {}

      mockDataLayerResult = {
        intersectingAreaPercentage: 25.5,
        intersectionAreaHa: 0.25
      }

      mockSssiConsentRequiredAction = {
        UPL1: {
          name: 'sssi-consent-required-sssi',
          passed: true,
          reason: 'A SSSI consent is required',
          caveat: {
            code: 'sssi-consent-required',
            description: 'A SSSI consent is required',
            metadata: {
              percentageOverlap: 25.5,
              overlapAreaHectares: 0.25
            }
          }
        },
        UPL2: {
          name: 'sssi-consent-required-sssi',
          passed: true,
          reason: 'No SSSI consent is required',
          caveat: null
        }
      }

      mockTransformedParcels = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          size: { unit: 'ha', value: 1.0 },
          actions: [
            {
              code: 'UPL1',
              description: 'Action 1',
              availableArea: { unit: 'ha', value: 0.5 },
              sssiConsentRequired: true
            },
            {
              code: 'UPL2',
              description: 'Action 2',
              availableArea: { unit: 'ha', value: 0.3 },
              sssiConsentRequired: false
            }
          ]
        }
      ]

      // Setup mock implementations
      getDataLayerQueryAccumulated.mockResolvedValue(mockDataLayerResult)
      executeSingleRuleForEnabledActions.mockReturnValue(
        mockSssiConsentRequiredAction
      )
      sssiConsentRequiredActionTransformer.mockReturnValue(
        mockTransformedParcels
      )
    })

    test('should transform response parcels with SSSI consent required flags', async () => {
      const result = await getActionsForParcelWithSSSIConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        mockEnabledActions,
        mockLogger,
        mockPostgresDb
      )

      expect(getDataLayerQueryAccumulated).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        DATA_LAYER_TYPES.sssi,
        mockPostgresDb,
        mockLogger
      )
      expect(executeSingleRuleForEnabledActions).toHaveBeenCalled()
      const callArgs = executeSingleRuleForEnabledActions.mock.calls[0]
      expect(callArgs[0]).toEqual(mockEnabledActions)
      expect(
        callArgs[1].landParcel.intersections.sssi.intersectingAreaPercentage
      ).toBe(25.5)
      expect(callArgs[2]).toBe('sssi-consent-required')
      expect(sssiConsentRequiredActionTransformer).toHaveBeenCalledWith(
        mockResponseParcels,
        mockSssiConsentRequiredAction
      )
      expect(result).toEqual(mockTransformedParcels)
    })

    test('should handle zero intersecting area percentage', async () => {
      getDataLayerQueryAccumulated.mockResolvedValue({
        intersectingAreaPercentage: 0,
        intersectionAreaHa: 0
      })

      await getActionsForParcelWithSSSIConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        mockEnabledActions,
        mockLogger,
        mockPostgresDb
      )

      const callArgs = executeSingleRuleForEnabledActions.mock.calls[0]
      expect(
        callArgs[1].landParcel.intersections.sssi.intersectingAreaPercentage
      ).toBe(0)
    })

    test('should handle empty enabled actions array', async () => {
      executeSingleRuleForEnabledActions.mockReturnValue({})
      sssiConsentRequiredActionTransformer.mockReturnValue(mockResponseParcels)

      const result = await getActionsForParcelWithSSSIConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        [],
        mockLogger,
        mockPostgresDb
      )

      expect(sssiConsentRequiredActionTransformer).toHaveBeenCalledWith(
        mockResponseParcels,
        {}
      )
      expect(result).toEqual(mockResponseParcels)
    })

    test('should propagate error from getDataLayerQueryAccumulated', async () => {
      const dbError = new Error('Database connection failed')
      getDataLayerQueryAccumulated.mockRejectedValue(dbError)

      await expect(
        getActionsForParcelWithSSSIConsentRequired(
          mockParcelIds,
          mockResponseParcels,
          mockEnabledActions,
          mockLogger,
          mockPostgresDb
        )
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('getActionsForParcelWithHEFERConsentRequired', () => {
    let mockParcelIds
    let mockResponseParcels
    let mockEnabledActions
    let mockPostgresDb
    let mockDataLayerResult
    let mockHeferConsentRequiredAction
    let mockTransformedParcels

    beforeEach(() => {
      vi.clearAllMocks()

      mockParcelIds = ['SX0679-9238']

      mockResponseParcels = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          size: { unit: 'ha', value: 1.0 },
          actions: [
            {
              code: 'UPL1',
              description: 'Action 1',
              availableArea: { unit: 'ha', value: 0.5 }
            },
            {
              code: 'UPL2',
              description: 'Action 2',
              availableArea: { unit: 'ha', value: 0.3 }
            }
          ]
        }
      ]

      mockEnabledActions = [
        {
          code: 'UPL1',
          description: 'Action 1',
          enabled: true,
          display: true,
          rules: [
            {
              name: 'hefer-consent-required',
              version: '1.0.0',
              config: {
                layerName: 'historic_features',
                caveatDescription: 'A hefer is needed from Historic England',
                tolerancePercent: 0
              }
            }
          ]
        },
        {
          code: 'UPL2',
          description: 'Action 2',
          enabled: true,
          display: true,
          rules: [
            {
              name: 'hefer-consent-required',
              version: '1.0.0',
              config: {
                layerName: 'historic_features',
                caveatDescription: 'A hefer is needed from Historic England',
                tolerancePercent: 0
              }
            }
          ]
        }
      ]

      mockPostgresDb = {}

      mockDataLayerResult = {
        intersectingAreaPercentage: 15.2,
        intersectionAreaHa: 0.15
      }

      mockHeferConsentRequiredAction = {
        UPL1: {
          name: 'hefer-consent-required',
          passed: true,
          reason: 'A hefer is needed from Historic England',
          caveat: {
            code: 'hefer-consent-required',
            description: 'A hefer is needed from Historic England',
            metadata: {
              percentageOverlap: 15.2,
              overlapAreaHectares: 0.15
            }
          }
        },
        UPL2: {
          name: 'hefer-consent-required',
          passed: true,
          reason: 'No hefer is needed from Historic England',
          caveat: null
        }
      }

      mockTransformedParcels = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          size: { unit: 'ha', value: 1.0 },
          actions: [
            {
              code: 'UPL1',
              description: 'Action 1',
              availableArea: { unit: 'ha', value: 0.5 },
              heferRequired: true
            },
            {
              code: 'UPL2',
              description: 'Action 2',
              availableArea: { unit: 'ha', value: 0.3 },
              heferRequired: false
            }
          ]
        }
      ]

      getDataLayerQueryUnion.mockResolvedValue(mockDataLayerResult)
      executeSingleRuleForEnabledActions.mockReturnValue(
        mockHeferConsentRequiredAction
      )
      heferRequiredActionTransformer.mockReturnValue(mockTransformedParcels)
    })

    test('should transform response parcels with HEFER consent required flags', async () => {
      const result = await getActionsForParcelWithHEFERConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        mockEnabledActions,
        mockLogger,
        mockPostgresDb
      )

      expect(getDataLayerQueryUnion).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        DATA_LAYER_TYPES.historic_features,
        mockPostgresDb,
        mockLogger
      )
      expect(executeSingleRuleForEnabledActions).toHaveBeenCalled()
      const callArgs = executeSingleRuleForEnabledActions.mock.calls[0]
      expect(callArgs[0]).toEqual(mockEnabledActions)
      expect(
        callArgs[1].landParcel.intersections.historic_features
          .intersectingAreaPercentage
      ).toBe(15.2)
      expect(callArgs[2]).toBe('hefer-consent-required')
      expect(heferRequiredActionTransformer).toHaveBeenCalledWith(
        mockResponseParcels,
        mockHeferConsentRequiredAction
      )
      expect(result).toEqual(mockTransformedParcels)
    })

    test('should handle zero intersecting area percentage', async () => {
      getDataLayerQueryUnion.mockResolvedValue({
        intersectingAreaPercentage: 0,
        intersectionAreaHa: 0
      })

      await getActionsForParcelWithHEFERConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        mockEnabledActions,
        mockLogger,
        mockPostgresDb
      )

      const callArgs = executeSingleRuleForEnabledActions.mock.calls[0]
      expect(
        callArgs[1].landParcel.intersections.historic_features
          .intersectingAreaPercentage
      ).toBe(0)
    })

    test('should handle empty enabled actions array', async () => {
      executeSingleRuleForEnabledActions.mockReturnValue({})
      heferRequiredActionTransformer.mockReturnValue(mockResponseParcels)

      const result = await getActionsForParcelWithHEFERConsentRequired(
        mockParcelIds,
        mockResponseParcels,
        [],
        mockLogger,
        mockPostgresDb
      )

      expect(heferRequiredActionTransformer).toHaveBeenCalledWith(
        mockResponseParcels,
        {}
      )
      expect(result).toEqual(mockResponseParcels)
    })

    test('should propagate error from getDataLayerQueryUnion', async () => {
      const dbError = new Error('Database connection failed')
      getDataLayerQueryUnion.mockRejectedValue(dbError)

      await expect(
        getActionsForParcelWithHEFERConsentRequired(
          mockParcelIds,
          mockResponseParcels,
          mockEnabledActions,
          mockLogger,
          mockPostgresDb
        )
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('getActionsForParcel', () => {
    let mockParcel
    let mockPayload
    let mockEnabledActionsForParcel
    let mockRequest
    let mockCompatibilityCheckFn

    beforeEach(() => {
      vi.clearAllMocks()

      mockParcel = {
        parcel_id: '9238',
        sheet_id: 'SX0679',
        area_sqm: 100000
      }

      mockPayload = {
        fields: ['size', 'actions'],
        plannedActions: [],
        sbi: '123456789'
      }

      mockEnabledActionsForParcel = [
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL1',
          description: 'Action 1',
          display: true
        },
        {
          applicationUnitOfMeasurement: 'ha',
          code: 'UPL2',
          description: 'Action 2',
          display: false
        },
        {
          applicationUnitOfMeasurement: 'sqm',
          code: 'HEF1',
          description: 'Action 3',
          display: true
        }
      ]

      mockRequest = {
        server: { postgresDb: {} },
        logger: mockLogger
      }

      mockCompatibilityCheckFn = vi.fn()

      getAgreements.mockResolvedValue([])
      mergeAgreementsTransformer.mockReturnValue([])
      plannedActionsTransformer.mockReturnValue([])
      sizeTransformer.mockImplementation((value) => ({ unit: 'ha', value }))
      getAvailableAreaDataRequirements.mockResolvedValue({
        landCoverToString: 'grass'
      })
      findMaximumAvailableArea.mockReturnValue({
        context: {},
        availableAreaSqm: 5000,
        totalValidLandCoverSqm: 5000,
        feasible: true
      })
      throwIfInfeasible.mockImplementation(() => undefined)
      formatExplanationSections.mockReturnValue([])
      actionTransformer.mockImplementation((action) => ({
        code: action.code,
        description: action.description
      }))
    })

    test('should return parcelId and sheetId', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        { ...mockPayload, fields: [] },
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(result).toEqual({
        parcelId: '9238',
        sheetId: 'SX0679'
      })
    })

    test('should include size when size field is requested', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        { ...mockPayload, fields: ['size'] },
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(result.size).toEqual({ unit: 'ha', value: 10 })
    })

    test('should only process actions with display=true', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
    })

    test('should not run through AACs for actions with unit !== HECTARES', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        [mockEnabledActionsForParcel[2]],
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
    })

    test('should filter out non-hectare agreements when calculating available areas', async () => {
      const plannedActions = [
        {
          actionCode: 'HEF1',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'UPL1',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      plannedActionsTransformer.mockReturnValue([
        { actionCode: 'UPL1', areaSqm: 100 }
      ])

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(plannedActionsTransformer).toHaveBeenCalledTimes(1)
      expect(plannedActionsTransformer).toHaveBeenCalledWith([
        plannedActions[1]
      ])

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SX0679',
        '9238',
        [{ actionCode: 'UPL1', areaSqm: 100 }],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )

      expect(findMaximumAvailableArea).toHaveBeenCalledTimes(1)
      expect(findMaximumAvailableArea).toHaveBeenCalledWith(
        'UPL1',
        [{ actionCode: 'UPL1', areaSqm: 100 }],
        mockCompatibilityCheckFn,
        { landCoverToString: 'grass' }
      )
    })

    test('should include actions in the response when actions field is requested', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(result.actions).toEqual([
        { code: 'UPL1', description: 'Action 1' },
        { code: 'HEF1', description: 'Action 3' }
      ])
    })

    test('should pass showActionResults through to actionTransformer', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        true,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActionsForParcel[0],
        expect.objectContaining({ availableAreaSqm: 5000 }),
        true
      )
    })

    test('should default showActionResults to false when omitted', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        undefined,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActionsForParcel[0],
        expect.objectContaining({ availableAreaSqm: 5000 }),
        undefined
      )
    })

    test('should not fetch agreements or actions when actions field is not requested', async () => {
      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, fields: ['size'] },
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(getAgreements).not.toHaveBeenCalled()
      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
    })

    test('should propagate error when the available area is infeasible', async () => {
      const infeasibleError = new Error('Infeasible area')
      throwIfInfeasible.mockImplementation(() => {
        throw infeasibleError
      })

      await expect(
        getActionsForParcel(
          mockParcel,
          mockPayload,
          false,
          mockEnabledActionsForParcel,
          mockCompatibilityCheckFn,
          mockRequest,
          'token'
        )
      ).rejects.toThrow('Infeasible area')
    })
  })
})
