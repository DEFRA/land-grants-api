import { heferConsentRequired } from './hefer-consent-required.js'

describe('heferConsentRequired', () => {
  const createApplication = (
    intersectionValue,
    layerName = 'historic_features'
  ) => ({
    landParcel: {
      intersections:
        intersectionValue !== undefined
          ? {
              [layerName]: {
                intersectingAreaPercentage: intersectionValue,
                intersectionAreaHa: 0.1
              }
            }
          : {}
    }
  })

  const createRule = (
    name = 'hefer-consent-required',
    layerName = 'historic_features',
    caveatDescription = 'A hefer is needed from Historic England',
    tolerancePercent = 0
  ) => ({
    name,
    description:
      'Does the site require a Historic Environment Farm Environment Record?',
    config: {
      layerName,
      caveatDescription,
      tolerancePercent
    }
  })

  test('should return passed true when no intersection exists', () => {
    const application = createApplication(0)
    const rule = createRule()
    const result = heferConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'hefer-consent-required',
      passed: true,
      reason: 'No hefer is needed from Historic England',
      description:
        'Does the site require a Historic Environment Farm Environment Record?',
      explanations: [
        {
          title: 'historic_features check',
          lines: [
            'This parcel has a 0% intersection with the historic_features layer. The tolerance is 0%.'
          ]
        }
      ]
    })
  })

  test('should return passed true when intersection percentage exceeds tolerance with caveat', () => {
    const application = createApplication(5)
    const rule = createRule()
    const result = heferConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'hefer-consent-required',
      passed: true,
      reason: 'A hefer is needed from Historic England',
      description:
        'Does the site require a Historic Environment Farm Environment Record?',
      explanations: [
        {
          title: 'historic_features check',
          lines: [
            'This parcel has a 5% intersection with the historic_features layer. The tolerance is 0%.'
          ]
        }
      ],
      caveat: {
        code: 'hefer-consent-required',
        description: 'A hefer is needed from Historic England',
        metadata: {
          percentageOverlap: 5,
          overlapAreaHectares: 0.1
        }
      }
    })
  })

  test('should return passed false when intersection data is not provided', () => {
    const application = createApplication(undefined)
    const rule = createRule()
    const result = heferConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'hefer-consent-required',
      passed: false,
      description:
        'Does the site require a Historic Environment Farm Environment Record?',
      reason:
        'An intersection with the historic_features layer was not provided in the application data',
      explanations: [{ title: 'historic_features check', lines: [] }]
    })
  })

  test('should include parcelId, sheetId and actionCode in caveat metadata when provided', () => {
    const application = {
      ...createApplication(5),
      parcelId: 'parcel-123',
      sheetId: 'sheet-456',
      actionCode: 'UPL1'
    }
    const rule = createRule()
    const result = heferConsentRequired.execute(application, rule)

    expect(result.caveat).toEqual({
      code: 'hefer-consent-required',
      description: 'A hefer is needed from Historic England',
      metadata: {
        actionCode: 'UPL1',
        parcelId: 'parcel-123',
        sheetId: 'sheet-456',
        percentageOverlap: 5,
        overlapAreaHectares: 0.1
      }
    })
  })

  test('should use custom layer name in explanations', () => {
    const application = createApplication(5, 'custom-layer')
    const rule = createRule(
      'hefer-consent-required',
      'custom-layer',
      'A hefer is needed from Historic England',
      0
    )
    const result = heferConsentRequired.execute(application, rule)

    expect(result.name).toBe('hefer-consent-required')
    expect(result.explanations[0].title).toBe('custom-layer check')
    expect(result.explanations[0].lines).toEqual([
      'This parcel has a 5% intersection with the custom-layer layer. The tolerance is 0%.'
    ])
    expect(result.caveat).toEqual({
      code: 'hefer-consent-required',
      description: 'A hefer is needed from Historic England',
      metadata: {
        percentageOverlap: 5,
        overlapAreaHectares: 0.1
      }
    })
  })
})
