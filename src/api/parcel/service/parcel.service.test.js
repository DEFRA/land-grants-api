import {
  splitParcelId,
  getParcelActionsWithAvailableArea
} from './parcel.service.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import {
  actionTransformer,
  plannedActionsTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'

// Mock the dependencies
jest.mock('~/src/available-area/availableArea.js')
jest.mock('~/src/api/parcel/transformers/parcelActions.transformer.js')

describe('Parcel Service', () => {
  const mockLogger = {
    error: jest.fn(),
    info: jest.fn()
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

  describe('getParcelActionsWithAvailableArea', () => {
    let mockParcel
    let mockActions
    let mockEnabledActions
    let mockCompatibilityCheckFn
    let mockPostgresDb
    let mockTransformedActions
    let mockAacDataRequirements
    let mockAvailableArea
    let mockTransformedAction

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks()

      // Setup test data
      mockParcel = {
        sheet_id: 'SH123',
        parcel_id: 'PA456',
        area_sqm: 10000
      }

      mockActions = [
        { actionCode: 'UPL1', quantity: 0.5, unit: 'ha' },
        { actionCode: 'CMOR1', quantity: 1.0, unit: 'ha' }
      ]

      mockEnabledActions = [
        {
          code: 'UPL1',
          description: 'Action 1',
          display: true,
          payment: { rate: 100 }
        },
        {
          code: 'UPL2',
          description: 'Action 2',
          display: true,
          payment: { rate: 200 }
        },
        {
          code: 'UPL3',
          description: 'Hidden Action',
          display: false,
          payment: { rate: 150 }
        }
      ]

      mockCompatibilityCheckFn = jest.fn()
      mockPostgresDb = {}

      mockTransformedActions = [
        { actionCode: 'UPL1', areaSqm: 5000 },
        { actionCode: 'CMOR1', areaSqm: 10000 }
      ]

      mockAacDataRequirements = {
        parcelData: { sheet_id: 'SH123', parcel_id: 'PA456' }
      }

      mockAvailableArea = {
        availableAreaHectares: 0.5,
        totalValidLandCoverSqm: 5000,
        stacks: [],
        explanations: []
      }

      mockTransformedAction = {
        code: 'UPL1',
        description: 'Action 1',
        availableArea: { unit: 'ha', value: 0.5 },
        rate: 100
      }

      // Setup mock implementations
      plannedActionsTransformer.mockReturnValue(mockTransformedActions)
      getAvailableAreaDataRequirements.mockResolvedValue(
        mockAacDataRequirements
      )
      getAvailableAreaForAction.mockReturnValue(mockAvailableArea)
      actionTransformer.mockReturnValue(mockTransformedAction)
    })

    test('should process all enabled actions with display=true', async () => {
      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Should only process actions with display=true (UPL1 and UPL2)
      expect(result).toHaveLength(2)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(2)
      expect(getAvailableAreaForAction).toHaveBeenCalledTimes(2)
      expect(actionTransformer).toHaveBeenCalledTimes(2)
    })

    test('should filter out actions with display=false', async () => {
      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Should not process UPL3 which has display=false
      expect(result).toHaveLength(2)

      // Verify UPL3 was never processed
      const callsForUPL3 = getAvailableAreaDataRequirements.mock.calls.filter(
        (call) => call[0] === 'UPL3'
      )
      expect(callsForUPL3).toHaveLength(0)
    })

    test('should call plannedActionsTransformer with correct actions', async () => {
      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // plannedActionsTransformer should be called once per displayed action
      expect(plannedActionsTransformer).toHaveBeenCalledTimes(2)
      expect(plannedActionsTransformer).toHaveBeenCalledWith(mockActions)
    })

    test('should call getAvailableAreaDataRequirements with correct parameters', async () => {
      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Check first call for UPL1
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SH123',
        'PA456',
        mockTransformedActions,
        mockPostgresDb,
        mockLogger
      )

      // Check second call for UPL2
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL2',
        'SH123',
        'PA456',
        mockTransformedActions,
        mockPostgresDb,
        mockLogger
      )
    })

    test('should call getAvailableAreaForAction with correct parameters', async () => {
      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Check first call for UPL1
      expect(getAvailableAreaForAction).toHaveBeenCalledWith(
        'UPL1',
        'SH123',
        'PA456',
        mockCompatibilityCheckFn,
        mockTransformedActions,
        mockAacDataRequirements,
        mockLogger
      )

      // Check second call for UPL2
      expect(getAvailableAreaForAction).toHaveBeenCalledWith(
        'UPL2',
        'SH123',
        'PA456',
        mockCompatibilityCheckFn,
        mockTransformedActions,
        mockAacDataRequirements,
        mockLogger
      )
    })

    test('should call actionTransformer with showActionResults=false', async () => {
      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Check that actionTransformer was called with showResults=false
      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActions[0],
        mockAvailableArea,
        false
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActions[1],
        mockAvailableArea,
        false
      )
    })

    test('should call actionTransformer with showActionResults=true', async () => {
      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        true,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Check that actionTransformer was called with showResults=true
      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActions[0],
        mockAvailableArea,
        true
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActions[1],
        mockAvailableArea,
        true
      )
    })

    test('should return array of transformed actions', async () => {
      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Result should be array of transformed actions
      expect(result).toEqual([mockTransformedAction, mockTransformedAction])
    })

    test('should handle empty enabled actions array', async () => {
      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        [],
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
      expect(getAvailableAreaForAction).not.toHaveBeenCalled()
      expect(actionTransformer).not.toHaveBeenCalled()
    })

    test('should handle enabled actions with all display=false', async () => {
      const hiddenActions = [
        {
          code: 'UPL1',
          description: 'Hidden Action 1',
          display: false,
          payment: { rate: 100 }
        },
        {
          code: 'UPL2',
          description: 'Hidden Action 2',
          display: false,
          payment: { rate: 200 }
        }
      ]

      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        hiddenActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
      expect(getAvailableAreaForAction).not.toHaveBeenCalled()
      expect(actionTransformer).not.toHaveBeenCalled()
    })

    test('should process single enabled action correctly', async () => {
      const singleAction = [mockEnabledActions[0]]

      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        singleAction,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toHaveLength(1)
      expect(result).toEqual([mockTransformedAction])
      expect(plannedActionsTransformer).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaForAction).toHaveBeenCalledTimes(1)
      expect(actionTransformer).toHaveBeenCalledTimes(1)
    })

    test('should process each action sequentially', async () => {
      const callOrder = []

      getAvailableAreaDataRequirements.mockImplementation((code) => {
        callOrder.push(`dataReq-${code}`)
        return Promise.resolve(mockAacDataRequirements)
      })

      getAvailableAreaForAction.mockImplementation((code) => {
        callOrder.push(`availArea-${code}`)
        return mockAvailableArea
      })

      actionTransformer.mockImplementation((action) => {
        callOrder.push(`transform-${action.code}`)
        return mockTransformedAction
      })

      await getParcelActionsWithAvailableArea(
        mockParcel,
        mockActions,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      // Verify sequential processing for UPL1 then UPL2
      expect(callOrder).toEqual([
        'dataReq-UPL1',
        'availArea-UPL1',
        'transform-UPL1',
        'dataReq-UPL2',
        'availArea-UPL2',
        'transform-UPL2'
      ])
    })

    test('should handle null actions', async () => {
      plannedActionsTransformer.mockReturnValue([])

      const result = await getParcelActionsWithAvailableArea(
        mockParcel,
        null,
        false,
        mockEnabledActions,
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(result).toHaveLength(2)
      expect(plannedActionsTransformer).toHaveBeenCalledWith(null)
    })

    test('should pass through all parcel data correctly', async () => {
      const detailedParcel = {
        sheet_id: 'DETAILED123',
        parcel_id: 'PARCEL789',
        area_sqm: 50000,
        otherData: 'should not interfere'
      }

      await getParcelActionsWithAvailableArea(
        detailedParcel,
        mockActions,
        false,
        [mockEnabledActions[0]],
        mockCompatibilityCheckFn,
        mockPostgresDb,
        mockLogger
      )

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'DETAILED123',
        'PARCEL789',
        mockTransformedActions,
        mockPostgresDb,
        mockLogger
      )

      expect(getAvailableAreaForAction).toHaveBeenCalledWith(
        'UPL1',
        'DETAILED123',
        'PARCEL789',
        mockCompatibilityCheckFn,
        mockTransformedActions,
        mockAacDataRequirements,
        mockLogger
      )
    })
  })
})
