import {
  excludeRulesRequiring,
  resolveApplicationData,
  ruleKeyFor
} from './resolveApplicationData.js'
import { requirementProviders } from './dataProviders.js'

// A registry of rules that need nothing, one thing, or several, and providers
// that fetch canned data, so the resolver is tested apart from real rules and
// real queries
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({
  rules: {
    'needs-nothing-1.0.0': {},
    'needs-intersection-1.0.0': { requires: [{ type: 'INTERSECTION' }] },
    'needs-size-1.0.0': { requires: [{ type: 'PARCEL_SIZE' }] },
    'needs-size-2.0.0': { requires: [{ type: 'PARCEL_SIZE' }] },
    'needs-quantity-and-size-1.0.0': {
      requires: [{ type: 'APPLIED_FOR_QUANTITY' }, { type: 'PARCEL_SIZE' }]
    },
    'needs-unknown-1.0.0': { requires: [{ type: 'UNKNOWN' }] }
  }
}))

vi.mock('./dataProviders.js', () => ({
  requirementProviders: {
    INTERSECTION: {
      dedupeKey: (req) => `intersection:${req.layer}`,
      fetch: vi.fn(),
      apply: (application, req, value) => {
        application.landParcel.intersections[req.layer] = value
      }
    },
    PARCEL_SIZE: {
      dedupeKey: () => 'parcelSize',
      fetch: vi.fn(),
      apply: (application, _req, value) => {
        application.landParcel.parcelSizeSqm = value
      }
    }
  }
}))

const intersectionProvider = requirementProviders.INTERSECTION
const parcelSizeProvider = requirementProviders.PARCEL_SIZE

describe('ruleKeyFor', () => {
  it('keys a rule by its name and version', () => {
    expect(ruleKeyFor({ name: 'needs-size', version: '2.0.0' })).toBe(
      'needs-size-2.0.0'
    )
  })

  it('prefers the rule type over its name', () => {
    expect(
      ruleKeyFor({ type: 'needs-size', name: 'ignored', version: '1.0.0' })
    ).toBe('needs-size-1.0.0')
  })

  it('defaults to version 1.0.0', () => {
    expect(ruleKeyFor({ name: 'needs-size' })).toBe('needs-size-1.0.0')
  })
})

describe('excludeRulesRequiring', () => {
  it('drops rules that require the excluded data type', () => {
    const actionRules = [
      { name: 'needs-size' },
      { name: 'needs-quantity-and-size' }
    ]

    expect(excludeRulesRequiring(actionRules, 'APPLIED_FOR_QUANTITY')).toEqual([
      { name: 'needs-size' }
    ])
  })

  it('keeps rules that require nothing', () => {
    const actionRules = [{ name: 'needs-nothing' }]

    expect(excludeRulesRequiring(actionRules, 'APPLIED_FOR_QUANTITY')).toEqual(
      actionRules
    )
  })

  it('keeps rules missing from the registry, since nothing says what they need', () => {
    const actionRules = [{ name: 'not-registered' }]

    expect(excludeRulesRequiring(actionRules, 'APPLIED_FOR_QUANTITY')).toEqual(
      actionRules
    )
  })

  it('looks the rule up by its version', () => {
    const actionRules = [{ name: 'needs-size', version: '2.0.0' }]

    expect(excludeRulesRequiring(actionRules, 'PARCEL_SIZE')).toEqual([])
  })

  it('returns no rules when given none', () => {
    expect(excludeRulesRequiring([], 'APPLIED_FOR_QUANTITY')).toEqual([])
  })
})

describe('resolveApplicationData', () => {
  const logger = { warn: vi.fn() }
  const ctx = { landAction: { sheetId: 'SH123', parcelId: '9456' }, logger }

  const baseApplication = () => ({
    actionCodeAppliedFor: 'BND1',
    landParcel: { existingAgreements: [] }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    intersectionProvider.fetch.mockImplementation((req) =>
      Promise.resolve({ layer: req.layer })
    )
    parcelSizeProvider.fetch.mockResolvedValue(12000)
  })

  it('fetches nothing when there are no rules', async () => {
    const application = await resolveApplicationData(
      undefined,
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).not.toHaveBeenCalled()
    expect(parcelSizeProvider.fetch).not.toHaveBeenCalled()
    expect(application).toEqual({
      actionCodeAppliedFor: 'BND1',
      landParcel: { existingAgreements: [], intersections: {} }
    })
  })

  it('fetches nothing for a rule that requires nothing', async () => {
    await resolveApplicationData(
      [{ name: 'needs-nothing' }],
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).not.toHaveBeenCalled()
    expect(parcelSizeProvider.fetch).not.toHaveBeenCalled()
  })

  it('fetches nothing for a rule missing from the registry', async () => {
    await resolveApplicationData(
      [{ name: 'not-registered' }],
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).not.toHaveBeenCalled()
    expect(parcelSizeProvider.fetch).not.toHaveBeenCalled()
  })

  it('fetches what a rule requires and applies it to the application', async () => {
    const application = await resolveApplicationData(
      [{ name: 'needs-size' }],
      baseApplication(),
      ctx
    )

    expect(application.landParcel.parcelSizeSqm).toBe(12000)
  })

  it('hands each provider the requirement and the context', async () => {
    await resolveApplicationData(
      [{ name: 'needs-size' }],
      baseApplication(),
      ctx
    )

    expect(parcelSizeProvider.fetch).toHaveBeenCalledWith(
      { type: 'PARCEL_SIZE' },
      ctx
    )
  })

  it('reads the data layer from the rule config', async () => {
    const application = await resolveApplicationData(
      [{ name: 'needs-intersection', config: { layerName: 'sssi' } }],
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).toHaveBeenCalledWith(
      { type: 'INTERSECTION', layer: 'sssi' },
      ctx
    )
    expect(application.landParcel.intersections).toEqual({
      sssi: { layer: 'sssi' }
    })
  })

  it('fetches data once however many rules require it', async () => {
    await resolveApplicationData(
      [
        { name: 'needs-intersection', config: { layerName: 'sssi' } },
        { name: 'needs-intersection', config: { layerName: 'sssi' } },
        { name: 'needs-size' },
        { name: 'needs-size', version: '2.0.0' }
      ],
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).toHaveBeenCalledTimes(1)
    expect(parcelSizeProvider.fetch).toHaveBeenCalledTimes(1)
  })

  it('fetches each data layer separately', async () => {
    const application = await resolveApplicationData(
      [
        { name: 'needs-intersection', config: { layerName: 'sssi' } },
        { name: 'needs-intersection', config: { layerName: 'moorland' } }
      ],
      baseApplication(),
      ctx
    )

    expect(intersectionProvider.fetch).toHaveBeenCalledTimes(2)
    expect(application.landParcel.intersections).toEqual({
      sssi: { layer: 'sssi' },
      moorland: { layer: 'moorland' }
    })
  })

  it('warns about and skips a requirement no provider supplies', async () => {
    const application = await resolveApplicationData(
      [{ name: 'needs-quantity-and-size' }],
      baseApplication(),
      ctx
    )

    expect(logger.warn).toHaveBeenCalledWith(
      "No provider for requirement type 'APPLIED_FOR_QUANTITY'"
    )
    expect(application.landParcel.parcelSizeSqm).toBe(12000)
  })

  it('skips a requirement no provider supplies when there is no logger', async () => {
    const application = await resolveApplicationData(
      [{ name: 'needs-unknown' }, { name: 'needs-size' }],
      baseApplication(),
      { ...ctx, logger: undefined }
    )

    expect(application.landParcel.parcelSizeSqm).toBe(12000)
  })

  it('fetches every requirement in parallel', async () => {
    let resolveSize
    parcelSizeProvider.fetch.mockReturnValue(
      new Promise((resolve) => {
        resolveSize = resolve
      })
    )

    const pending = resolveApplicationData(
      [
        { name: 'needs-size' },
        { name: 'needs-intersection', config: { layerName: 'sssi' } }
      ],
      baseApplication(),
      ctx
    )

    // The intersection is asked for while the parcel size is still outstanding
    expect(intersectionProvider.fetch).toHaveBeenCalled()

    resolveSize(12000)
    const application = await pending

    expect(application.landParcel.parcelSizeSqm).toBe(12000)
  })

  it('rejects when a provider fails to fetch', async () => {
    parcelSizeProvider.fetch.mockRejectedValue(new Error('db down'))

    await expect(
      resolveApplicationData([{ name: 'needs-size' }], baseApplication(), ctx)
    ).rejects.toThrow('db down')
  })

  it('keeps what the base application already holds', async () => {
    const base = {
      appliedForQuantity: 50,
      landParcel: {
        existingAgreements: [{ actionCode: 'BND2' }],
        intersections: { moorland: { layer: 'moorland' } }
      }
    }

    const application = await resolveApplicationData(
      [{ name: 'needs-intersection', config: { layerName: 'sssi' } }],
      base,
      ctx
    )

    expect(application).toEqual({
      appliedForQuantity: 50,
      landParcel: {
        existingAgreements: [{ actionCode: 'BND2' }],
        intersections: {
          moorland: { layer: 'moorland' },
          sssi: { layer: 'sssi' }
        }
      }
    })
  })

  it('leaves the base application untouched', async () => {
    const base = {
      landParcel: {
        existingAgreements: [],
        intersections: { moorland: { layer: 'moorland' } }
      }
    }

    await resolveApplicationData(
      [
        { name: 'needs-size' },
        { name: 'needs-intersection', config: { layerName: 'sssi' } }
      ],
      base,
      ctx
    )

    expect(base).toEqual({
      landParcel: {
        existingAgreements: [],
        intersections: { moorland: { layer: 'moorland' } }
      }
    })
  })

  it('builds a parcel when the base application has none', async () => {
    const application = await resolveApplicationData(
      [{ name: 'needs-size' }],
      {},
      ctx
    )

    expect(application.landParcel).toEqual({
      intersections: {},
      parcelSizeSqm: 12000
    })
  })
})
