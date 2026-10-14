import { resolveApplicationData } from './resolveApplicationData.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getBoundaryIntersection } from '~/src/features/data-layers/queries/getBoundaryIntersection.query.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'

// Real rules and real providers, with only the queries stubbed, so a rule
// reading a field its provider does not write fails here
vi.mock('~/src/features/data-layers/queries/getBoundaryIntersection.query.js')
vi.mock('~/src/features/available-length/availableLength.js')

const minimumLengthRule = {
  name: 'minimum-length',
  description: 'Is the applied for length at least 20 m?',
  config: { minimumLengthM: 20 }
}

const availableLengthRule = {
  name: 'applied-for-total-or-partial-available-length',
  description: 'Is the applied for length no more than the available length?'
}

const sssiConsentRule = {
  name: 'sssi-consent-required',
  type: 'boundary-intersection-consent-required',
  description:
    'Does the parcel boundary intersect a site of special scientific interest?',
  config: {
    caveatCode: 'ne-consent-required',
    caveatDescription: 'A consent is required from Natural England',
    layerName: 'sssi',
    toleranceMeters: 0
  }
}

const heferConsentRule = {
  name: 'hefer-consent-required',
  type: 'boundary-intersection-consent-required',
  description:
    'Does the parcel boundary intersect a historic or archaeological feature?',
  config: {
    caveatCode: 'hefer-consent-required',
    caveatDescription: 'A HEFER is needed from Historic England',
    layerName: 'historic_features',
    toleranceMeters: 0
  }
}

const linearActionRules = [
  minimumLengthRule,
  availableLengthRule,
  sssiConsentRule,
  heferConsentRule
]

describe('linear action rules with their data providers', () => {
  const action = { code: 'BND2_26', quantity: 100 }
  const landAction = { sheetId: 'SD6743', parcelId: '8083', actions: [action] }
  const ctx = {
    action,
    actions: [{ code: 'BND2_26', applicationUnitOfMeasurement: 'm' }],
    agreements: [],
    compatibilityCheckFn: vi.fn(),
    landAction,
    db: {},
    logger: { warn: vi.fn() }
  }

  const givenAvailableLength = (
    availableLength,
    incompatibleLengthMeters = 0
  ) =>
    getAvailableLength.mockResolvedValue({
      availableLength,
      boundaryLengthMeters: availableLength + incompatibleLengthMeters,
      incompatibleLengthMeters,
      incompatibleActions: [],
      exceedsBoundary: false
    })

  const givenBoundaryIntersection = (intersectingLengthMeters) =>
    getBoundaryIntersection.mockResolvedValue({
      intersectingLengthMeters,
      boundaryLengthMeters: 900
    })

  const validate = async (actionRules, appliedForQuantity) => {
    const application = await resolveApplicationData(
      actionRules,
      { appliedForQuantity, landParcel: { existingAgreements: [] } },
      ctx
    )
    return executeRules(rules, application, actionRules).results
  }

  const resultFor = (results, name) => results.find((r) => r.name === name)

  beforeEach(() => {
    vi.clearAllMocks()
    givenAvailableLength(200)
    givenBoundaryIntersection(0)
  })

  it('fails an applied-for length above the available length', async () => {
    const results = await validate(linearActionRules, 201)

    expect(resultFor(results, availableLengthRule.name).passed).toBe(false)
  })

  it('passes an applied-for length within the available length', async () => {
    const results = await validate(linearActionRules, 200)

    expect(resultFor(results, availableLengthRule.name).passed).toBe(true)
  })

  it('fails the minimum length when less than the minimum is available, with no available length rule configured', async () => {
    givenAvailableLength(10)

    const results = await validate([minimumLengthRule], 20)

    expect(resultFor(results, minimumLengthRule.name).reason).toBe(
      'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (10 m)'
    )
  })

  it('explains the parcel boundary and the length already committed to incompatible actions', async () => {
    givenAvailableLength(900, 27)

    const results = await validate(linearActionRules, 100)

    expect(
      resultFor(results, minimumLengthRule.name).explanations[0].lines
    ).toContain(
      'The parcel boundary is (927 m) and (27 m) is already committed to incompatible actions'
    )
  })

  it.each([sssiConsentRule, heferConsentRule])(
    'passes $name with no caveat on a boundary clear of the layer',
    async (rule) => {
      const results = await validate(linearActionRules, 100)

      const { passed, caveat } = resultFor(results, rule.name)
      expect({ passed, caveat }).toEqual({ passed: true, caveat: undefined })
    }
  )

  it.each([sssiConsentRule, heferConsentRule])(
    'raises the $config.caveatCode caveat when the boundary intersects the layer',
    async (rule) => {
      givenBoundaryIntersection(50)

      const results = await validate(linearActionRules, 100)

      expect(resultFor(results, rule.name).caveat?.code).toBe(
        rule.config.caveatCode
      )
    }
  )
})
