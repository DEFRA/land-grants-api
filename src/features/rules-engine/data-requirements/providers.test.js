import { describe, test, expect, vi, beforeEach } from 'vitest'
import { requirementProviders } from './providers.js'
import { getMoorlandInterceptPercentage } from '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js'
import { getLfaInterceptPercentage } from '~/src/features/parcel/queries/getLfaInterceptPercentage.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated,
  getDataLayerQueryUnion
} from '~/src/features/data-layers/queries/getDataLayer.query.js'

vi.mock(
  '~/src/features/parcel/queries/getMoorlandInterceptPercentage.js',
  () => ({ getMoorlandInterceptPercentage: vi.fn() })
)
vi.mock('~/src/features/parcel/queries/getLfaInterceptPercentage.js', () => ({
  getLfaInterceptPercentage: vi.fn()
}))
vi.mock('~/src/features/parcel/queries/getLandData.query.js', () => ({
  getLandData: vi.fn()
}))
vi.mock('~/src/features/data-layers/queries/getDataLayer.query.js', () => ({
  DATA_LAYER_TYPES: { sssi: 1, less_favoured_areas: 2, historic_features: 3 },
  getDataLayerQueryAccumulated: vi.fn(),
  getDataLayerQueryUnion: vi.fn()
}))

const ctx = {
  sheetId: 'SD5649',
  parcelId: '9215',
  db: { connect: vi.fn() },
  logger: { warn: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('intersection provider', () => {
  const { intersection } = requirementProviders

  test('dedupeKey is namespaced by layer', () => {
    expect(
      intersection.dedupeKey({ type: 'intersection', layer: 'moorland' })
    ).toBe('intersection:moorland')
    expect(
      intersection.dedupeKey({ type: 'intersection', layer: 'sssi' })
    ).toBe('intersection:sssi')
  })

  test('moorland wraps the percentage into an object', async () => {
    getMoorlandInterceptPercentage.mockResolvedValue(50)
    const value = await intersection.fetch(
      { type: 'intersection', layer: 'moorland' },
      ctx
    )
    expect(getMoorlandInterceptPercentage).toHaveBeenCalledWith(
      ctx.sheetId,
      ctx.parcelId,
      ctx.db,
      ctx.logger
    )
    expect(value).toEqual({ intersectingAreaPercentage: 50 })
  })

  test('lfa wraps the percentage into an object', async () => {
    getLfaInterceptPercentage.mockResolvedValue(100)
    const value = await intersection.fetch(
      { type: 'intersection', layer: 'lfa' },
      ctx
    )
    expect(getLfaInterceptPercentage).toHaveBeenCalledWith(
      ctx.sheetId,
      ctx.parcelId,
      ctx.db,
      ctx.logger
    )
    expect(value).toEqual({ intersectingAreaPercentage: 100 })
  })

  test('sssi uses the accumulated data layer query', async () => {
    const expected = {
      intersectingAreaPercentage: 12.5,
      intersectionAreaHa: 0.4
    }
    getDataLayerQueryAccumulated.mockResolvedValue(expected)
    const value = await intersection.fetch(
      { type: 'intersection', layer: 'sssi' },
      ctx
    )
    expect(getDataLayerQueryAccumulated).toHaveBeenCalledWith(
      ctx.sheetId,
      ctx.parcelId,
      DATA_LAYER_TYPES.sssi,
      ctx.db,
      ctx.logger
    )
    expect(value).toBe(expected)
  })

  test('historic_features uses the union data layer query', async () => {
    const expected = { intersectingAreaPercentage: 5, intersectionAreaHa: 0.05 }
    getDataLayerQueryUnion.mockResolvedValue(expected)
    const value = await intersection.fetch(
      { type: 'intersection', layer: 'historic_features' },
      ctx
    )
    expect(getDataLayerQueryUnion).toHaveBeenCalledWith(
      ctx.sheetId,
      ctx.parcelId,
      DATA_LAYER_TYPES.historic_features,
      ctx.db,
      ctx.logger
    )
    expect(value).toBe(expected)
  })

  test('unknown layer resolves to null and warns', async () => {
    const value = await intersection.fetch(
      { type: 'intersection', layer: 'nonsense' },
      ctx
    )
    expect(value).toBeNull()
    expect(ctx.logger.warn).toHaveBeenCalled()
  })

  test('apply writes the value at intersections[layer]', () => {
    const application = { landParcel: {} }
    intersection.apply(
      application,
      { type: 'intersection', layer: 'moorland' },
      { intersectingAreaPercentage: 50 }
    )
    expect(application.landParcel.intersections).toEqual({
      moorland: { intersectingAreaPercentage: 50 }
    })
  })
})

describe('parcelSize provider', () => {
  const { parcelSize } = requirementProviders

  test('dedupeKey is constant', () => {
    expect(parcelSize.dedupeKey({ type: 'parcelSize' })).toBe('parcelSize')
  })

  test('fetch delegates to getLandData', async () => {
    getLandData.mockResolvedValue([{ area: 1000 }])
    const value = await parcelSize.fetch({ type: 'parcelSize' }, ctx)
    expect(getLandData).toHaveBeenCalledWith(
      ctx.sheetId,
      ctx.parcelId,
      ctx.db,
      ctx.logger
    )
    expect(value).toEqual([{ area: 1000 }])
  })

  test('apply sets parcelSizeSqm from the first row area', () => {
    const application = { landParcel: {} }
    parcelSize.apply(application, { type: 'parcelSize' }, [{ area: 1000 }])
    expect(application.landParcel.parcelSizeSqm).toBe(1000)
  })

  test('apply defaults parcelSizeSqm to 0 when no data', () => {
    const application = { landParcel: {} }
    parcelSize.apply(application, { type: 'parcelSize' }, null)
    expect(application.landParcel.parcelSizeSqm).toBe(0)
  })
})
