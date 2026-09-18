import { boundaryIntersectionConsentRequired } from './boundary-intersection-consent-required.js'
import { executeRules } from '../../rulesEngine.js'
import { rules } from '../index.js'

describe('boundaryIntersectionConsentRequired', () => {
  const createApplication = (
    boundaryIntersections,
    appliedForQuantity = 150
  ) => ({
    parcelId: '7704',
    sheetId: 'SD6855',
    actionCode: 'BND1',
    appliedForQuantity,
    landParcel: { boundaryIntersections }
  })

  const createRule = (overrides = {}) => ({
    name: 'sssi-consent-required',
    type: 'boundary-intersection-consent-required',
    description:
      'Does the parcel boundary intersect a site of special scientific interest?',
    config: {
      layerName: 'sssi',
      caveatCode: 'ne-consent-required',
      caveatDescription: 'A consent is required from Natural England',
      toleranceMeters: 0,
      ...overrides
    }
  })

  test('raises the consent caveat when the boundary lies inside the layer', () => {
    const application = createApplication({
      sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
    })

    const result = boundaryIntersectionConsentRequired.execute(
      application,
      createRule()
    )

    expect(result).toEqual({
      name: 'sssi-consent-required',
      passed: true,
      reason: 'A consent is required from Natural England',
      description:
        'Does the parcel boundary intersect a site of special scientific interest?',
      explanations: [
        {
          title: 'sssi boundary check',
          lines: [
            'The parcel boundary is (3518 m) and (180 m) of it is inside the sssi layer. The tolerance is (0 m).'
          ]
        }
      ],
      caveat: {
        code: 'ne-consent-required',
        description: 'A consent is required from Natural England',
        metadata: {
          actionCode: 'BND1',
          parcelId: '7704',
          sheetId: 'SD6855',
          intersectingLengthMeters: 180,
          boundaryLengthMeters: 3518
        }
      }
    })
  })

  test('passes without a caveat when the boundary is nowhere near the layer', () => {
    const application = createApplication({
      sssi: { intersectingLengthMeters: 0, boundaryLengthMeters: 927 }
    })

    const result = boundaryIntersectionConsentRequired.execute(
      application,
      createRule()
    )

    expect(result).toEqual({
      name: 'sssi-consent-required',
      passed: true,
      reason: 'No consent is required for the sssi layer',
      description:
        'Does the parcel boundary intersect a site of special scientific interest?',
      explanations: [
        {
          title: 'sssi boundary check',
          lines: [
            'The parcel boundary is (927 m) and (0 m) of it is inside the sssi layer. The tolerance is (0 m).'
          ]
        }
      ]
    })
  })

  test('passes without a caveat when the intersection is within tolerance', () => {
    const application = createApplication({
      sssi: { intersectingLengthMeters: 4, boundaryLengthMeters: 927 }
    })

    const result = boundaryIntersectionConsentRequired.execute(
      application,
      createRule({ toleranceMeters: 5 })
    )

    expect(result.passed).toBe(true)
    expect(result.caveat).toBeUndefined()
    expect(result.explanations[0].lines).toEqual([
      'The parcel boundary is (927 m) and (4 m) of it is inside the sssi layer. The tolerance is (5 m).'
    ])
  })

  test('raises the HEFER caveat for the historic features layer with the same executor', () => {
    const application = createApplication({
      historic_features: {
        intersectingLengthMeters: 60,
        boundaryLengthMeters: 1734
      }
    })
    const rule = createRule({
      layerName: 'historic_features',
      caveatCode: 'hefer-consent-required',
      caveatDescription: 'A HEFER is needed from Historic England'
    })

    const result = boundaryIntersectionConsentRequired.execute(
      application,
      rule
    )

    expect(result.passed).toBe(true)
    expect(result.caveat).toEqual({
      code: 'hefer-consent-required',
      description: 'A HEFER is needed from Historic England',
      metadata: {
        actionCode: 'BND1',
        parcelId: '7704',
        sheetId: 'SD6855',
        intersectingLengthMeters: 60,
        boundaryLengthMeters: 1734
      }
    })
  })

  // Caveat if and only if the intersecting length exceeds the tolerance
  test.each([
    [1, 0, true],
    [5, 5, false],
    [6, 5, true]
  ])(
    'intersecting %i m with tolerance %i m raises a caveat: %s',
    (intersectingLengthMeters, toleranceMeters, expectCaveat) => {
      const application = createApplication({
        sssi: { intersectingLengthMeters, boundaryLengthMeters: 3518 }
      })

      const result = boundaryIntersectionConsentRequired.execute(
        application,
        createRule({ toleranceMeters })
      )

      expect(result.passed).toBe(true)
      expect(result.caveat !== undefined).toBe(expectCaveat)
    }
  )

  test('is independent of the quantity applied for', () => {
    const boundaryIntersections = {
      sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
    }

    const forTwentyMetres = boundaryIntersectionConsentRequired.execute(
      createApplication(boundaryIntersections, 20),
      createRule()
    )
    const forWholeBoundary = boundaryIntersectionConsentRequired.execute(
      createApplication(boundaryIntersections, 3518),
      createRule()
    )

    expect(forWholeBoundary).toEqual(forTwentyMetres)
  })

  describe('fails closed', () => {
    test('when no boundary intersections were supplied', () => {
      const result = boundaryIntersectionConsentRequired.execute(
        createApplication(null),
        createRule()
      )

      expect(result).toEqual({
        name: 'sssi-consent-required',
        passed: false,
        reason:
          'A boundary intersection with the sssi layer was not provided in the application data',
        description:
          'Does the parcel boundary intersect a site of special scientific interest?',
        explanations: [{ title: 'sssi boundary check', lines: [] }]
      })
    })

    test('when the configured layer has no boundary intersection', () => {
      const result = boundaryIntersectionConsentRequired.execute(
        createApplication({ sssi: null }),
        createRule()
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toBe(
        'A boundary intersection with the sssi layer was not provided in the application data'
      )
    })

    test('when layerName is missing from the rule config', () => {
      const result = boundaryIntersectionConsentRequired.execute(
        createApplication({
          sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
        }),
        createRule({ layerName: undefined })
      )

      expect(result).toEqual({
        name: 'sssi-consent-required',
        passed: false,
        reason: 'Missing config for boundary intersection consent',
        description:
          'Does the parcel boundary intersect a site of special scientific interest?',
        explanations: [
          {
            title: 'Boundary intersection',
            lines: ['No layerName or caveatCode is configured for this rule']
          }
        ]
      })
    })

    test('when the rule has no config at all', () => {
      const result = boundaryIntersectionConsentRequired.execute(
        createApplication({
          sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
        }),
        { name: 'sssi-consent-required', description: 'SSSI boundary check' }
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toBe(
        'Missing config for boundary intersection consent'
      )
    })

    test('when caveatCode is missing from the rule config', () => {
      const result = boundaryIntersectionConsentRequired.execute(
        createApplication({
          sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
        }),
        createRule({ caveatCode: undefined })
      )

      expect(result.passed).toBe(false)
      expect(result.reason).toBe(
        'Missing config for boundary intersection consent'
      )
    })
  })

  test('is dispatched from the registry by type, keeping the configured rule name', () => {
    const application = createApplication({
      sssi: { intersectingLengthMeters: 180, boundaryLengthMeters: 3518 }
    })

    const { results, passed } = executeRules(rules, application, [createRule()])

    expect(passed).toBe(true)
    expect(results[0].name).toBe('sssi-consent-required')
    expect(results[0].caveat.code).toBe('ne-consent-required')
  })
})
