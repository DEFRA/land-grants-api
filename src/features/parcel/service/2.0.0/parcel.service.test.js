import {
  getActionsForParcel,
  getActionsForParcelWithSSSIConsentRequired,
  getActionsForParcelWithHEFERConsentRequired,
  splitParcelId
} from './parcel.service.js'
import {
  plannedActionsTransformer,
  sizeTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'
import {
  findMaximumAvailableArea,
  throwIfInfeasible
} from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { mergeAgreementsTransformer } from '~/src/features/agreements/transformers/agreements.transformer.js'

// The consent transformers run for real so the consent tests assert on the
// flags an applicant sees, not on what the rules engine was called with
vi.mock(
  '~/src/features/parcel/transformers/parcelActions.transformer.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      plannedActionsTransformer: vi.fn(),
      sizeTransformer: vi.fn()
    }
  }
)
vi.mock('~/src/features/data-layers/queries/getDataLayer.query.js')
vi.mock('~/src/features/data-layers/queries/getBoundaryIntersection.query.js')
vi.mock('~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js')
vi.mock('~/src/features/available-area/availableArea.js')
vi.mock('~/src/features/available-area/explanations.js')
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

  describe('consent flags', () => {
    const parcelIds = ['SX0679-9238']
    const postgresDb = {}

    const responseParcels = [
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

    const areaAction = (code, rule) => ({
      applicationUnitOfMeasurement: 'ha',
      code,
      description: `Action ${code}`,
      enabled: true,
      display: true,
      rules: rule ? [rule] : []
    })

    const linearAction = (code, rule, display = true) => ({
      applicationUnitOfMeasurement: 'm',
      code,
      description: `Action ${code}`,
      enabled: true,
      display,
      rules: rule ? [rule] : []
    })

    const boundaryRule = (name, layerName, caveatCode) => ({
      name,
      type: 'boundary-intersection-consent-required',
      version: '1.0.0',
      config: {
        layerName,
        caveatCode,
        caveatDescription: 'Consent is required',
        toleranceMeters: 0
      }
    })

    const responseParcelsWithBnd1 = [
      {
        ...responseParcels[0],
        actions: [
          ...responseParcels[0].actions,
          {
            code: 'BND1',
            description: 'Action BND1',
            availableArea: { unit: 'm', value: null }
          }
        ]
      }
    ]

    const flagsOf = (parcels, flag) =>
      Object.fromEntries(parcels[0].actions.map((a) => [a.code, a[flag]]))

    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('getActionsForParcelWithSSSIConsentRequired', () => {
      const sssiRule = {
        name: 'sssi-consent-required',
        version: '1.0.0',
        config: {
          layerName: 'sssi',
          caveatDescription: 'A consent is required from Natural England',
          tolerancePercent: 1
        }
      }
      const enabledActions = [areaAction('UPL1', sssiRule), areaAction('UPL2')]

      beforeEach(() => {
        getDataLayerQueryAccumulated.mockResolvedValue({
          intersectingAreaPercentage: 25.5,
          intersectionAreaHa: 0.25
        })
      })

      test('queries the sssi layer for the requested parcel', async () => {
        await getActionsForParcelWithSSSIConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(getDataLayerQueryAccumulated).toHaveBeenCalledWith(
          'SX0679',
          '9238',
          DATA_LAYER_TYPES.sssi,
          postgresDb,
          mockLogger
        )
      })

      test('flags an action whose sssi rule raises a caveat and not one without the rule', async () => {
        const result = await getActionsForParcelWithSSSIConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
          UPL1: true,
          UPL2: false
        })
      })

      test('does not flag an action when the intersection is within tolerance', async () => {
        getDataLayerQueryAccumulated.mockResolvedValue({
          intersectingAreaPercentage: 0,
          intersectionAreaHa: 0
        })

        const result = await getActionsForParcelWithSSSIConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
          UPL1: false,
          UPL2: false
        })
      })

      test('adds the flag to every action while preserving the rest of the parcel', async () => {
        const result = await getActionsForParcelWithSSSIConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(result).toEqual([
          {
            ...responseParcels[0],
            actions: [
              { ...responseParcels[0].actions[0], sssiConsentRequired: true },
              { ...responseParcels[0].actions[1], sssiConsentRequired: false }
            ]
          }
        ])
      })

      test('flags nothing when no actions are enabled', async () => {
        const result = await getActionsForParcelWithSSSIConsentRequired(
          parcelIds,
          responseParcels,
          [],
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
          UPL1: false,
          UPL2: false
        })
      })

      test('propagates an error from the sssi query', async () => {
        getDataLayerQueryAccumulated.mockRejectedValue(
          new Error('Database connection failed')
        )

        await expect(
          getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcels,
            enabledActions,
            mockLogger,
            postgresDb
          )
        ).rejects.toThrow('Database connection failed')
      })

      describe('with a linear action', () => {
        const sssiBoundaryRule = boundaryRule(
          'sssi-consent-required',
          'sssi',
          'ne-consent-required'
        )
        const actionsWithBnd1 = [
          ...enabledActions,
          linearAction('BND1', sssiBoundaryRule)
        ]

        beforeEach(() => {
          getDataLayerQueryAccumulated.mockResolvedValue({
            intersectingAreaPercentage: 0,
            intersectionAreaHa: 0
          })
          getBoundaryIntersection.mockResolvedValue({
            intersectingLengthMeters: 897,
            boundaryLengthMeters: 3518
          })
        })

        test('queries the sssi boundary intersection for the requested parcel', async () => {
          await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(getBoundaryIntersection).toHaveBeenCalledWith(
            'SX0679',
            '9238',
            DATA_LAYER_TYPES.sssi,
            postgresDb,
            mockLogger
          )
        })

        test('flags the linear action on a boundary the area rule misses, leaving the area action unflagged', async () => {
          const result = await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
            UPL1: false,
            UPL2: false,
            BND1: true
          })
        })

        test('does not flag the linear action when its boundary touches nothing', async () => {
          getBoundaryIntersection.mockResolvedValue({
            intersectingLengthMeters: 0,
            boundaryLengthMeters: 927
          })

          const result = await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
            UPL1: false,
            UPL2: false,
            BND1: false
          })
        })

        test('does not flag the linear action when the boundary query fails', async () => {
          getBoundaryIntersection.mockResolvedValue(null)

          const result = await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(flagsOf(result, 'sssiConsentRequired')).toEqual({
            UPL1: false,
            UPL2: false,
            BND1: false
          })
        })

        test('does not query the boundary when no displayed action is measured in metres', async () => {
          await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcels,
            enabledActions,
            mockLogger,
            postgresDb
          )

          expect(getBoundaryIntersection).not.toHaveBeenCalled()
        })

        test('does not query the boundary when the only linear action is hidden', async () => {
          await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcels,
            [...enabledActions, linearAction('BND1', sssiBoundaryRule, false)],
            mockLogger,
            postgresDb
          )

          expect(getBoundaryIntersection).not.toHaveBeenCalled()
        })
      })
    })

    describe('getActionsForParcelWithHEFERConsentRequired', () => {
      const heferRule = {
        name: 'hefer-consent-required',
        version: '1.0.0',
        config: {
          layerName: 'historic_features',
          caveatDescription: 'A HEFER is needed from Historic England',
          tolerancePercent: 0
        }
      }
      const enabledActions = [areaAction('UPL1', heferRule), areaAction('UPL2')]

      beforeEach(() => {
        getDataLayerQueryUnion.mockResolvedValue({
          intersectingAreaPercentage: 15.2,
          intersectionAreaHa: 0.15
        })
      })

      test('queries the historic features layer for the requested parcel', async () => {
        await getActionsForParcelWithHEFERConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(getDataLayerQueryUnion).toHaveBeenCalledWith(
          'SX0679',
          '9238',
          DATA_LAYER_TYPES.historic_features,
          postgresDb,
          mockLogger
        )
      })

      test('flags an action whose hefer rule raises a caveat and not one without the rule', async () => {
        const result = await getActionsForParcelWithHEFERConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'heferRequired')).toEqual({
          UPL1: true,
          UPL2: false
        })
      })

      test('does not flag an action when the intersection is within tolerance', async () => {
        getDataLayerQueryUnion.mockResolvedValue({
          intersectingAreaPercentage: 0,
          intersectionAreaHa: 0
        })

        const result = await getActionsForParcelWithHEFERConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'heferRequired')).toEqual({
          UPL1: false,
          UPL2: false
        })
      })

      test('adds the flag to every action while preserving the rest of the parcel', async () => {
        const result = await getActionsForParcelWithHEFERConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(result).toEqual([
          {
            ...responseParcels[0],
            actions: [
              { ...responseParcels[0].actions[0], heferRequired: true },
              { ...responseParcels[0].actions[1], heferRequired: false }
            ]
          }
        ])
      })

      test('flags nothing when no actions are enabled', async () => {
        const result = await getActionsForParcelWithHEFERConsentRequired(
          parcelIds,
          responseParcels,
          [],
          mockLogger,
          postgresDb
        )

        expect(flagsOf(result, 'heferRequired')).toEqual({
          UPL1: false,
          UPL2: false
        })
      })

      test('propagates an error from the historic features query', async () => {
        getDataLayerQueryUnion.mockRejectedValue(
          new Error('Database connection failed')
        )

        await expect(
          getActionsForParcelWithHEFERConsentRequired(
            parcelIds,
            responseParcels,
            enabledActions,
            mockLogger,
            postgresDb
          )
        ).rejects.toThrow('Database connection failed')
      })

      describe('with a linear action', () => {
        const heferBoundaryRule = boundaryRule(
          'hefer-consent-required',
          'historic_features',
          'hefer-consent-required'
        )
        const actionsWithBnd1 = [
          ...enabledActions,
          linearAction('BND1', heferBoundaryRule)
        ]

        beforeEach(() => {
          getDataLayerQueryUnion.mockResolvedValue({
            intersectingAreaPercentage: 0,
            intersectionAreaHa: 0
          })
          getBoundaryIntersection.mockResolvedValue({
            intersectingLengthMeters: 929,
            boundaryLengthMeters: 10334
          })
        })

        test('queries the historic features boundary intersection for the requested parcel', async () => {
          await getActionsForParcelWithHEFERConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(getBoundaryIntersection).toHaveBeenCalledWith(
            'SX0679',
            '9238',
            DATA_LAYER_TYPES.historic_features,
            postgresDb,
            mockLogger
          )
        })

        test('flags the linear action whose boundary crosses historic features', async () => {
          const result = await getActionsForParcelWithHEFERConsentRequired(
            parcelIds,
            responseParcelsWithBnd1,
            actionsWithBnd1,
            mockLogger,
            postgresDb
          )

          expect(flagsOf(result, 'heferRequired')).toEqual({
            UPL1: false,
            UPL2: false,
            BND1: true
          })
        })

        test('does not query the boundary when no displayed action is measured in metres', async () => {
          await getActionsForParcelWithHEFERConsentRequired(
            parcelIds,
            responseParcels,
            enabledActions,
            mockLogger,
            postgresDb
          )

          expect(getBoundaryIntersection).not.toHaveBeenCalled()
        })
      })
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
        []
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
        []
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
        []
      )

      // UPL2 has display=false and is skipped; UPL1 (ha) and HEF1 (sqm) both
      // go through AAC since both are area-unit actions.
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(2)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'UPL1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'HEF1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
    })

    test('should not run through AACs for non-area-unit actions (e.g. count)', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        [
          {
            applicationUnitOfMeasurement: 'count',
            code: 'WBD1',
            description: 'Manage ponds',
            display: true
          }
        ],
        mockCompatibilityCheckFn,
        mockRequest,
        'token'
      )

      expect(getAvailableAreaDataRequirements).not.toHaveBeenCalled()
    })

    test('should run building (sqm) actions through AACs', async () => {
      await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        [mockEnabledActionsForParcel[2]],
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(getAvailableAreaDataRequirements).toHaveBeenCalledTimes(1)
      expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
        'HEF1',
        'SX0679',
        '9238',
        [],
        mockRequest.server.postgresDb,
        mockRequest.logger
      )
    })

    test.each([
      ['building (sqm)', 2],
      ['hectare', 0]
    ])(
      'should still include a %s action with zero available area, so grants-ui sees the recomputed figure rather than a stale one',
      async (_description, actionIndex) => {
        findMaximumAvailableArea.mockReturnValue({
          context: {},
          availableAreaSqm: 0,
          totalValidLandCoverSqm: 0,
          feasible: true
        })

        const result = await getActionsForParcel(
          mockParcel,
          mockPayload,
          false,
          [mockEnabledActionsForParcel[actionIndex]],
          mockCompatibilityCheckFn,
          mockRequest,
          'token'
        )

        expect(actionTransformer).toHaveBeenCalled()
        expect(result.actions).toHaveLength(1)
      }
    )

    test('should include sqm-configured (e.g. building) actions as area demand alongside hectare actions', async () => {
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
          quantity: 2,
          unit: 'ha',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      plannedActionsTransformer.mockReturnValue([
        { actionCode: 'HEF1', areaSqm: 100 },
        { actionCode: 'UPL1', areaSqm: 20000 }
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

      // Computing UPL1's (ha) available area now also considers the
      // existing HEF1 (sqm) agreement as area demand - the AAC's own
      // land-cover eligibility decides whether they actually compete.
      expect(plannedActionsTransformer).toHaveBeenCalledWith(plannedActions)
    })

    test('should exclude configured non-area (count) actions from area demand', async () => {
      const plannedActions = [
        {
          actionCode: 'WBD1',
          quantity: 2,
          unit: 'count',
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

      const enabledActionsWithCount = [
        mockEnabledActionsForParcel[0],
        {
          applicationUnitOfMeasurement: 'count',
          code: 'WBD1',
          description: 'Manage ponds',
          display: true
        }
      ]

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        enabledActionsWithCount,
        mockCompatibilityCheckFn,
        mockRequest,
        []
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

    test('should judge an agreement by its own unit when its action code has no enabled-action config', async () => {
      const plannedActions = [
        {
          actionCode: 'LEGACY_AREA',
          quantity: 100,
          unit: 'sqm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'LEGACY_HECTARES',
          quantity: 2,
          unit: 'ha',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        },
        {
          actionCode: 'LEGACY_LENGTH',
          quantity: 500,
          unit: 'm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-01')
        }
      ]
      mergeAgreementsTransformer.mockReturnValue(plannedActions)
      plannedActionsTransformer.mockReturnValue([
        { actionCode: 'LEGACY_AREA', areaSqm: 100 }
      ])

      await getActionsForParcel(
        mockParcel,
        { ...mockPayload, plannedActions },
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        []
      )

      expect(plannedActionsTransformer).toHaveBeenCalledWith([
        plannedActions[0],
        plannedActions[1]
      ])
    })

    test('should include actions in the response when actions field is requested', async () => {
      const result = await getActionsForParcel(
        mockParcel,
        mockPayload,
        false,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        []
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
        []
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
        []
      )

      expect(actionTransformer).toHaveBeenCalledWith(
        mockEnabledActionsForParcel[0],
        expect.objectContaining({ availableAreaSqm: 5000 }),
        undefined
      )
    })

    test('should merge passed-in existing agreements with planned actions', async () => {
      const upl1 = {
        actionCode: 'UPL1',
        unit: 'ha',
        quantity: 0.5,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31')
      }

      await getActionsForParcel(
        mockParcel,
        mockPayload,
        undefined,
        mockEnabledActionsForParcel,
        mockCompatibilityCheckFn,
        mockRequest,
        [upl1]
      )

      expect(mergeAgreementsTransformer).toHaveBeenCalledWith([upl1], [])
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
          []
        )
      ).rejects.toThrow('Infeasible area')
    })
  })
})
