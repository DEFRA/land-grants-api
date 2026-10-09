import { requirementProviders } from './dataProviders.js'
import { REQUIRED_RULE_DATA } from './requiredRuleData.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getMoorlandIntersectPercentage } from '~/src/features/parcel/queries/getMoorlandIntersectPercentage.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { getLfaIntersectPercentage } from '~/src/features/parcel/queries/getLfaIntersectPercentage.js'
import { getSdaIntersectPercentage } from '~/src/features/parcel/queries/getSdaIntersectPercentage.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import { getAvailableArea } from '~/src/features/application/service/get-available-area.js'
import { getLandCoversForParcel } from '~/src/features/parcel/queries/getLandCoversForParcel.query.js'
import { getLandCoversForAction } from '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'

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
vi.mock('~/src/features/parcel/queries/getMoorlandIntersectPercentage.js')
vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('~/src/features/parcel/queries/getLfaIntersectPercentage.js')
vi.mock('~/src/features/parcel/queries/getSdaIntersectPercentage.js')
vi.mock('~/src/features/data-layers/queries/getBoundaryIntersection.query.js')
vi.mock('~/src/features/application/service/get-available-area.js')
vi.mock('~/src/features/parcel/queries/getLandCoversForParcel.query.js')
vi.mock(
  '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
)
vi.mock('~/src/features/available-length/availableLength.js')

describe('requirementProviders', () => {
  const db = {}
  const logger = { warn: vi.fn() }
  const action = { code: 'BND1', quantity: 50 }
  const actions = [{ code: 'BND1', applicationUnitOfMeasurement: 'm' }]
  const agreements = [{ actionCode: 'BND2', quantity: 200, unit: 'm' }]
  const compatibilityCheckFn = vi.fn()
  const landAction = { sheetId: 'SH123', parcelId: '9456', actions: [action] }

  const ctx = {
    action,
    actions,
    agreements,
    compatibilityCheckFn,
    landAction,
    db,
    logger
  }

  const emptyApplication = () => ({ landParcel: {} })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has a provider for every data type the rules can require except the applied-for quantity', () => {
    const providedTypes = Object.keys(requirementProviders)
    const expectedTypes = Object.values(REQUIRED_RULE_DATA).filter(
      (type) => type !== REQUIRED_RULE_DATA.APPLIED_FOR_QUANTITY
    )

    expect(providedTypes.sort()).toEqual(expectedTypes.sort())
  })

  describe('INTERSECTION', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.INTERSECTION]

    it('dedupes by layer', () => {
      expect(provider.dedupeKey({ layer: 'sssi' })).toBe('intersection:sssi')
      expect(provider.dedupeKey({ layer: 'moorland' })).toBe(
        'intersection:moorland'
      )
    })

    it('reports the moorland intersection as a percentage', async () => {
      getMoorlandIntersectPercentage.mockResolvedValue(42)

      const value = await provider.fetch({ layer: 'moorland' }, ctx)

      expect(value).toEqual({ intersectingAreaPercentage: 42 })
      expect(getMoorlandIntersectPercentage).toHaveBeenCalledWith(
        'SH123',
        '9456',
        db,
        logger
      )
    })

    it('reports the less favoured area intersection as a percentage', async () => {
      getLfaIntersectPercentage.mockResolvedValue(17)

      const value = await provider.fetch({ layer: 'lfa' }, ctx)

      expect(value).toEqual({ intersectingAreaPercentage: 17 })
      expect(getLfaIntersectPercentage).toHaveBeenCalledWith(
        'SH123',
        '9456',
        db,
        logger
      )
    })

    it('accumulates the sssi intersection across overlapping features', async () => {
      const sssi = { intersectingAreaPercentage: 10, intersectionAreaSqm: 500 }
      getDataLayerQueryAccumulated.mockResolvedValue(sssi)

      const value = await provider.fetch({ layer: 'sssi' }, ctx)

      expect(value).toBe(sssi)
      expect(getDataLayerQueryAccumulated).toHaveBeenCalledWith(
        'SH123',
        '9456',
        DATA_LAYER_TYPES.sssi,
        db,
        logger
      )
    })

    it('unions the historic features intersection', async () => {
      const historic = { intersectingAreaPercentage: 5 }
      getDataLayerQueryUnion.mockResolvedValue(historic)

      const value = await provider.fetch({ layer: 'historic_features' }, ctx)

      expect(value).toBe(historic)
      expect(getDataLayerQueryUnion).toHaveBeenCalledWith(
        'SH123',
        '9456',
        DATA_LAYER_TYPES.historic_features,
        db,
        logger
      )
    })

    it('reads the severely disadvantaged area intersection', async () => {
      const sda = { intersectingAreaPercentage: 80 }
      getSdaIntersectPercentage.mockResolvedValue(sda)

      const value = await provider.fetch(
        { layer: 'severely_disadvantaged_area' },
        ctx
      )

      expect(value).toBe(sda)
      expect(getSdaIntersectPercentage).toHaveBeenCalledWith(
        'SH123',
        '9456',
        db,
        logger
      )
    })

    it('warns and resolves null for a layer with no strategy', async () => {
      const value = await provider.fetch({ layer: 'unknown' }, ctx)

      expect(value).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        "No intersection strategy for data layer 'unknown'"
      )
    })

    it('resolves null for a layer with no strategy when there is no logger', async () => {
      const value = await provider.fetch(
        { layer: 'unknown' },
        { ...ctx, logger: undefined }
      )

      expect(value).toBeNull()
    })

    it('stores each layer under the parcel intersections', () => {
      const application = emptyApplication()

      provider.apply(application, { layer: 'sssi' }, { a: 1 })
      provider.apply(application, { layer: 'moorland' }, { b: 2 })

      expect(application.landParcel.intersections).toEqual({
        sssi: { a: 1 },
        moorland: { b: 2 }
      })
    })
  })

  describe('BOUNDARY_INTERSECTION', () => {
    const provider =
      requirementProviders[REQUIRED_RULE_DATA.BOUNDARY_INTERSECTION]

    it('dedupes by layer', () => {
      expect(provider.dedupeKey({ layer: 'sssi' })).toBe(
        'boundaryIntersection:sssi'
      )
    })

    it.each([['sssi'], ['historic_features']])(
      'reads the %s boundary intersection',
      async (layer) => {
        const intersection = { intersects: true }
        getBoundaryIntersection.mockResolvedValue(intersection)

        const value = await provider.fetch({ layer }, ctx)

        expect(value).toBe(intersection)
        expect(getBoundaryIntersection).toHaveBeenCalledWith(
          'SH123',
          '9456',
          DATA_LAYER_TYPES[layer],
          db,
          logger
        )
      }
    )

    it('warns and resolves null for a layer with no strategy', async () => {
      const value = await provider.fetch({ layer: 'moorland' }, ctx)

      expect(value).toBeNull()
      expect(getBoundaryIntersection).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        "No boundary intersection strategy for data layer 'moorland'"
      )
    })

    it('stores each layer on the application, not the parcel', () => {
      const application = emptyApplication()

      provider.apply(application, { layer: 'sssi' }, { a: 1 })
      provider.apply(application, { layer: 'historic_features' }, { b: 2 })

      expect(application.boundaryIntersection).toEqual({
        sssi: { a: 1 },
        historic_features: { b: 2 }
      })
      expect(application.landParcel).toEqual({})
    })
  })

  describe('PARCEL_SIZE', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.PARCEL_SIZE]

    it('dedupes to a single fetch', () => {
      expect(provider.dedupeKey({})).toBe('parcelSize')
    })

    it('reads the land data of the parcel', async () => {
      const landData = [{ area: 12000 }]
      getLandData.mockResolvedValue(landData)

      const value = await provider.fetch({}, ctx)

      expect(value).toBe(landData)
      expect(getLandData).toHaveBeenCalledWith('SH123', '9456', db, logger)
    })

    it('stores the area of the first row as the parcel size', () => {
      const application = emptyApplication()

      provider.apply(application, {}, [{ area: 12000 }, { area: 1 }])

      expect(application.landParcel.parcelSizeSqm).toBe(12000)
    })

    it.each([
      ['no land data', null],
      ['an empty result', []],
      ['a row without an area', [{}]]
    ])('stores a parcel size of zero for %s', (_, landData) => {
      const application = emptyApplication()

      provider.apply(application, {}, landData)

      expect(application.landParcel.parcelSizeSqm).toBe(0)
    })
  })

  describe('AVAILABLE_AREA', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.AVAILABLE_AREA]

    it('dedupes to a single fetch', () => {
      expect(provider.dedupeKey({})).toBe('availableArea')
    })

    it('works out the available area from the whole context', async () => {
      const availableArea = { availableAreaSqm: 5000 }
      getAvailableArea.mockResolvedValue(availableArea)

      const value = await provider.fetch({}, ctx)

      expect(value).toBe(availableArea)
      expect(getAvailableArea).toHaveBeenCalledWith(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      )
    })

    it('stores the available area on the parcel', () => {
      const application = emptyApplication()
      const availableArea = { availableAreaSqm: 5000 }

      provider.apply(application, {}, availableArea)

      expect(application.landParcel.availableArea).toBe(availableArea)
    })
  })

  describe('AVAILABLE_LENGTH', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.AVAILABLE_LENGTH]

    it('dedupes to a single fetch', () => {
      expect(provider.dedupeKey({})).toBe('availableLength')
    })

    it('works out the available length from the whole context', async () => {
      const availableLength = { availableLength: 800 }
      getAvailableLength.mockResolvedValue(availableLength)

      const value = await provider.fetch({}, ctx)

      expect(value).toBe(availableLength)
      expect(getAvailableLength).toHaveBeenCalledWith(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        db,
        logger
      )
    })

    it('stores the available length on the parcel', () => {
      const application = emptyApplication()
      const availableLength = { availableLength: 800 }

      provider.apply(application, {}, availableLength)

      expect(application.landParcel.availableLength).toBe(availableLength)
    })
  })

  describe('LAND_COVERS', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.LAND_COVERS]

    it('dedupes to a single fetch', () => {
      expect(provider.dedupeKey({})).toBe('landCovers')
    })

    it('reads the land covers of the parcel', async () => {
      const landCovers = [{ landCoverClassCode: '110', areaSqm: 100 }]
      getLandCoversForParcel.mockResolvedValue(landCovers)

      const value = await provider.fetch({}, ctx)

      expect(value).toBe(landCovers)
      expect(getLandCoversForParcel).toHaveBeenCalledWith(
        'SH123',
        '9456',
        db,
        logger
      )
    })

    it('stores the land covers on the parcel', () => {
      const application = emptyApplication()
      const landCovers = [{ landCoverClassCode: '110' }]

      provider.apply(application, {}, landCovers)

      expect(application.landParcel.landCovers).toBe(landCovers)
    })
  })

  describe('ACTION_LAND_COVERS', () => {
    const provider = requirementProviders[REQUIRED_RULE_DATA.ACTION_LAND_COVERS]

    it('dedupes to a single fetch', () => {
      expect(provider.dedupeKey({})).toBe('actionLandCovers')
    })

    it('reads the land covers valid for the action applied for', async () => {
      const actionLandCovers = { BND1: [{ landCoverClassCode: '110' }] }
      getLandCoversForAction.mockResolvedValue(actionLandCovers)

      const value = await provider.fetch({}, ctx)

      expect(value).toBe(actionLandCovers)
      expect(getLandCoversForAction).toHaveBeenCalledWith('BND1', db, logger)
    })

    it('stores the action land covers on the application, not the parcel', () => {
      const application = emptyApplication()
      const actionLandCovers = { BND1: [] }

      provider.apply(application, {}, actionLandCovers)

      expect(application.actionLandCovers).toBe(actionLandCovers)
      expect(application.landParcel).toEqual({})
    })
  })
})
