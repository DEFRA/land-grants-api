import {
  splitParcelId,
  getParcelActionsWithAvailableArea
} from './parcel.service.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'

jest.mock('~/src/available-area/availableArea.js')

const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockGetAvailableAreaForAction = getAvailableAreaForAction

describe('Parcel Service', () => {
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
  }

  const mockPostgresDb = {
    connect: jest.fn(),
    query: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

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

  describe('getParcelActionsWithAvailableArea', () => {
    const sheetId = 'SX0679'
    const parcelId = '9238'
    const actions = []
    const showActionResults = false

    const mockEnabledActions = [
      {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        display: true,
        payment: {
          ratePerUnitGbp: 10.6,
          ratePerAgreementPerYearGbp: 272
        }
      },
      {
        code: 'UPL1',
        description: 'Upland action 1',
        display: true,
        payment: {
          ratePerUnitGbp: 15.5,
          ratePerAgreementPerYearGbp: 0
        }
      }
    ]

    const mockCompatibilityCheckFn = jest.fn()

    const mockAvailableAreaResult = {
      stacks: [],
      explanations: [],
      totalValidLandCoverSqm: 300,
      availableAreaSqm: 300,
      availableAreaHectares: 0.03
    }

    const mockDataRequirements = {
      landCoverCodesForAppliedForAction: [],
      landCoversForParcel: [],
      landCoversForExistingActions: []
    }

    beforeEach(() => {
      mockGetAvailableAreaDataRequirements.mockResolvedValue(
        mockDataRequirements
      )
      mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
    })

    test('should return actions with available area', async () => {
      const result = await getParcelActionsWithAvailableArea(
        sheetId,
        parcelId,
        actions,
        showActionResults,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        availableArea: {
          unit: 'ha',
          value: 0.03
        },
        ratePerUnitGbp: 10.6,
        ratePerAgreementPerYearGbp: 272
      })

      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledTimes(2)
      expect(mockGetAvailableAreaForAction).toHaveBeenCalledTimes(2)
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Found 2 action configs from DB'
      )
    })

    test('should include results when showActionResults is true', async () => {
      const mockAvailableAreaWithResults = {
        ...mockAvailableAreaResult,
        stacks: [{ code: 'CMOR1', quantity: 0.00001 }],
        explanations: ['Test explanation']
      }
      mockGetAvailableAreaForAction.mockReturnValue(
        mockAvailableAreaWithResults
      )

      const result = await getParcelActionsWithAvailableArea(
        sheetId,
        parcelId,
        actions,
        true, // showActionResults = true
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result[0]).toHaveProperty('results')
      expect(result[0].results).toEqual({
        totalValidLandCoverSqm: 300,
        stacks: [{ code: 'CMOR1', quantity: 0.00001 }],
        explanations: ['Test explanation']
      })
    })

    test('should only process actions with display: true', async () => {
      const enabledActionsWithHidden = [
        ...mockEnabledActions,
        {
          code: 'HIDDEN1',
          description: 'Hidden action',
          rate_per_unit_gbp: 5.0,
          rate_per_agreement_per_year_gbp: 0,
          display: false
        }
      ]

      const result = await getParcelActionsWithAvailableArea(
        sheetId,
        parcelId,
        actions,
        showActionResults,
        enabledActionsWithHidden,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toHaveLength(2)
      expect(result.find((a) => a.code === 'HIDDEN1')).toBeUndefined()
    })

    test('should throw error when enabledActions is null', async () => {
      await expect(
        getParcelActionsWithAvailableArea(
          sheetId,
          parcelId,
          actions,
          showActionResults,
          null,
          mockCompatibilityCheckFn,
          mockPostgresDb,
          mockLogger
        )
      ).rejects.toThrow('Actions not found')
    })

    test('should throw error when enabledActions is empty array', async () => {
      await expect(
        getParcelActionsWithAvailableArea(
          sheetId,
          parcelId,
          actions,
          showActionResults,
          [],
          mockCompatibilityCheckFn,
          mockPostgresDb,
          mockLogger
        )
      ).rejects.toThrow('Actions not found')
    })

    test('should pass planned actions to available area calculation', async () => {
      const plannedActions = [
        { actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }
      ]

      const transformedPlannedActions = [{ actionCode: 'UPL1', areaSqm: 0.1 }]

      await getParcelActionsWithAvailableArea(
        sheetId,
        parcelId,
        plannedActions,
        showActionResults,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(mockGetAvailableAreaForAction).toHaveBeenCalledWith(
        expect.any(String),
        sheetId,
        parcelId,
        mockCompatibilityCheckFn,
        transformedPlannedActions,
        expect.any(Object),
        expect.any(Object)
      )

      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'CMOR1',
        sheetId,
        parcelId,
        transformedPlannedActions,
        mockPostgresDb,
        mockLogger
      )
    })

    test('should call getAvailableAreaDataRequirements with correct parameters', async () => {
      const plannedActions = [
        { actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }
      ]

      const transformedPlannedActions = [{ actionCode: 'UPL1', areaSqm: 0.1 }]

      await getParcelActionsWithAvailableArea(
        sheetId,
        parcelId,
        plannedActions,
        showActionResults,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(mockGetAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'CMOR1',
        sheetId,
        parcelId,
        transformedPlannedActions,
        mockPostgresDb,
        mockLogger
      )
    })
  })
})
