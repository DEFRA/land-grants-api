import { describe, test, expect, vi, beforeEach } from 'vitest'
import { resolveApplicationData } from './resolveApplicationData.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { requirementProviders } from './providers.js'

vi.mock('~/src/features/rules-engine/rules/index.js', () => ({
  rules: {}
}))
vi.mock('./providers.js', () => ({
  requirementProviders: {}
}))

const ctx = {
  sheetId: 'SD5649',
  parcelId: '9215',
  db: {},
  logger: { warn: vi.fn() }
}

const baseApplication = () => ({
  actionCodeAppliedFor: 'CMOR1',
  landParcel: { availability: 100, intersections: {} }
})

beforeEach(() => {
  vi.clearAllMocks()
  for (const key of Object.keys(rules)) delete rules[key]
  for (const key of Object.keys(requirementProviders)) {
    delete requirementProviders[key]
  }
})

describe('resolveApplicationData', () => {
  test('collects requirements from the action rules and applies fetched data', async () => {
    rules['parcel-has-moorland-intersection-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'moorland' }]
    }
    requirementProviders.intersection = {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch: vi.fn().mockResolvedValue({ intersectingAreaPercentage: 50 }),
      apply: (app, req, value) => {
        app.landParcel.intersections[req.layer] = value
      }
    }

    const application = await resolveApplicationData(
      [{ name: 'parcel-has-moorland-intersection' }],
      baseApplication(),
      ctx
    )

    expect(requirementProviders.intersection.fetch).toHaveBeenCalledTimes(1)
    expect(application.landParcel.intersections).toEqual({
      moorland: { intersectingAreaPercentage: 50 }
    })
  })

  test('rules with no requires contribute nothing and trigger no fetches', async () => {
    rules['applied-for-total-available-area-1.0.0'] = { execute: vi.fn() }
    requirementProviders.intersection = {
      dedupeKey: () => 'x',
      fetch: vi.fn(),
      apply: vi.fn()
    }

    await resolveApplicationData(
      [{ name: 'applied-for-total-available-area' }],
      baseApplication(),
      ctx
    )

    expect(requirementProviders.intersection.fetch).not.toHaveBeenCalled()
  })

  test('dedupes: the same layer required by two rules is fetched once', async () => {
    rules['sssi-consent-required-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'sssi' }]
    }
    rules['parcel-has-sssi-intersection-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'sssi' }]
    }
    const fetch = vi.fn().mockResolvedValue({ intersectingAreaPercentage: 10 })
    requirementProviders.intersection = {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch,
      apply: (app, req, value) => {
        app.landParcel.intersections[req.layer] = value
      }
    }

    await resolveApplicationData(
      [
        { name: 'sssi-consent-required' },
        { name: 'parcel-has-sssi-intersection' }
      ],
      baseApplication(),
      ctx
    )

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('distinct layers are each fetched once', async () => {
    rules['parcel-has-moorland-intersection-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'moorland' }]
    }
    rules['parcel-has-sssi-intersection-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'sssi' }]
    }
    const fetch = vi.fn().mockResolvedValue({ intersectingAreaPercentage: 1 })
    requirementProviders.intersection = {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch,
      apply: (app, req, value) => {
        app.landParcel.intersections[req.layer] = value
      }
    }

    await resolveApplicationData(
      [
        { name: 'parcel-has-moorland-intersection' },
        { name: 'parcel-has-sssi-intersection' }
      ],
      baseApplication(),
      ctx
    )

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('respects rule.type dispatch and version when looking up requirements', async () => {
    rules['parcel-has-lfa-intersection-2.0.0'] = {
      requires: [{ type: 'intersection', layer: 'lfa' }]
    }
    const fetch = vi.fn().mockResolvedValue({ intersectingAreaPercentage: 100 })
    requirementProviders.intersection = {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch,
      apply: (app, req, value) => {
        app.landParcel.intersections[req.layer] = value
      }
    }

    await resolveApplicationData(
      [
        {
          name: 'parcel-is-on-less-favoured-area',
          type: 'parcel-has-lfa-intersection',
          version: '2.0.0'
        }
      ],
      baseApplication(),
      ctx
    )

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('does not mutate the base application', async () => {
    rules['parcel-has-moorland-intersection-1.0.0'] = {
      requires: [{ type: 'intersection', layer: 'moorland' }]
    }
    requirementProviders.intersection = {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch: vi.fn().mockResolvedValue({ intersectingAreaPercentage: 50 }),
      apply: (app, req, value) => {
        app.landParcel.intersections[req.layer] = value
      }
    }

    const base = baseApplication()
    const application = await resolveApplicationData(
      [{ name: 'parcel-has-moorland-intersection' }],
      base,
      ctx
    )

    expect(base.landParcel.intersections).toEqual({})
    expect(application).not.toBe(base)
  })

  test('unknown requirement type is skipped with a warning', async () => {
    rules['weird-rule-1.0.0'] = { requires: [{ type: 'not-a-real-provider' }] }

    const application = await resolveApplicationData(
      [{ name: 'weird-rule' }],
      baseApplication(),
      ctx
    )

    expect(ctx.logger.warn).toHaveBeenCalled()
    expect(application.landParcel.intersections).toEqual({})
  })
})
