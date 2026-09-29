import { addSssiConsentRequired, addHeferRequired } from './consent.service.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'

vi.mock('~/src/features/data-layers/queries/getDataLayer.query.js')
vi.mock('~/src/features/data-layers/queries/getBoundaryIntersection.query.js')

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}

describe('Consent service 2.0.0', () => {
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

  describe('addSssiConsentRequired', () => {
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
      await addSssiConsentRequired(
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
      const result = await addSssiConsentRequired(
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

      const result = await addSssiConsentRequired(
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
      const result = await addSssiConsentRequired(
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
      const result = await addSssiConsentRequired(
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
        addSssiConsentRequired(
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
        await addSssiConsentRequired(
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
        const result = await addSssiConsentRequired(
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

        const result = await addSssiConsentRequired(
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

        const result = await addSssiConsentRequired(
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
        await addSssiConsentRequired(
          parcelIds,
          responseParcels,
          enabledActions,
          mockLogger,
          postgresDb
        )

        expect(getBoundaryIntersection).not.toHaveBeenCalled()
      })

      test('does not query the boundary when the only linear action is hidden', async () => {
        await addSssiConsentRequired(
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

  describe('addHeferRequired', () => {
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
      await addHeferRequired(
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
      const result = await addHeferRequired(
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

      const result = await addHeferRequired(
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
      const result = await addHeferRequired(
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
      const result = await addHeferRequired(
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
        addHeferRequired(
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
        await addHeferRequired(
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
        const result = await addHeferRequired(
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
        await addHeferRequired(
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
