import {
  getActionsForParcelWithSSSIConsentRequired,
  getActionsForParcelWithHEFERConsentRequired,
  splitParcelId
} from './parcel.service.js'
import {
  heferRequiredActionTransformer,
  sssiConsentRequiredActionTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { executeSingleRuleForEnabledActions } from '~/src/features/rules-engine/rulesEngine.js'
import { vi } from 'vitest'

vi.mock('~/src/features/parcel/transformers/parcelActions.transformer.js')
vi.mock('~/src/features/data-layers/queries/getDataLayer.query.js')
vi.mock('~/src/features/rules-engine/rulesEngine.js')

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
})
