import { sssiConsentRequired } from './sssi-consent-required.js'

describe('sssiConsentRequired', () => {
  const createApplication = (intersectionValue, layerName = 'sssi') => ({
    landParcel: {
      intersections:
        intersectionValue !== undefined
          ? {
              [layerName]: { intersectingAreaPercentage: intersectionValue }
            }
          : {}
    }
  })

  const createRule = (
    name = 'sssi-consent-required',
    layerName = 'sssi',
    caveatDescription = 'A parcel requires SSSI consent from Natural England',
    tolerancePercent = 1
  ) => ({
    name,
    description: 'SSSI consent check',
    config: {
      layerName,
      caveatDescription,
      tolerancePercent
    }
  })

  test('should return passed true when no intersection exists', () => {
    const application = createApplication(0)
    const rule = createRule()
    const result = sssiConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'sssi-consent-required-sssi',
      passed: true,
      reason: 'A parcel requires SSSI consent from Natural England',
      description: 'SSSI consent check',
      explanations: [
        {
          title: 'sssi check',
          lines: [
            'This parcel has a 0% intersection with the sssi layer. The tolerance is 1%.'
          ]
        }
      ],
      cavets: {
        isConsentRequired: false
      }
    })
  })

  test('should return passed true when intersection percentage is below tolerance', () => {
    const application = createApplication(0.5)
    const rule = createRule(
      'sssi-consent-required',
      'sssi',
      'A parcel requires SSSI consent from Natural England',
      1
    )
    const result = sssiConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'sssi-consent-required-sssi',
      passed: true,
      reason: 'A parcel requires SSSI consent from Natural England',
      description: 'SSSI consent check',
      explanations: [
        {
          title: 'sssi check',
          lines: [
            'This parcel has a 0.5% intersection with the sssi layer. The tolerance is 1%.'
          ]
        }
      ],
      cavets: {
        isConsentRequired: false
      }
    })
  })

  test('should return passed true when intersection percentage exceeds tolerance', () => {
    const application = createApplication(5)
    const rule = createRule(
      'sssi-consent-required',
      'sssi',
      'A parcel requires SSSI consent from Natural England',
      1
    )
    const result = sssiConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'sssi-consent-required-sssi',
      passed: true,
      reason: 'No parcel requires SSSI consent from Natural England',
      description: 'SSSI consent check',
      explanations: [
        {
          title: 'sssi check',
          lines: [
            'This parcel has a 5% intersection with the sssi layer. The tolerance is 1%.'
          ]
        }
      ],
      cavets: {
        isConsentRequired: true
      }
    })
  })

  test('should return passed true when intersection percentage equals tolerance', () => {
    const application = createApplication(1)
    const rule = createRule(
      'sssi-consent-required',
      'sssi',
      'A parcel requires SSSI consent from Natural England',
      1
    )
    const result = sssiConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'sssi-consent-required-sssi',
      passed: true,
      reason: 'A parcel requires SSSI consent from Natural England',
      description: 'SSSI consent check',
      explanations: [
        {
          title: 'sssi check',
          lines: [
            'This parcel has a 1% intersection with the sssi layer. The tolerance is 1%.'
          ]
        }
      ],
      cavets: {
        isConsentRequired: false
      }
    })
  })

  test('should use custom layer name in name and explanations', () => {
    const application = createApplication(5, 'custom-layer')
    const rule = createRule(
      'sssi-consent-required',
      'custom-layer',
      'A parcel requires SSSI consent from Natural England',
      1
    )
    const result = sssiConsentRequired.execute(application, rule)

    expect(result.name).toBe('sssi-consent-required-custom-layer')
    expect(result.explanations[0].title).toBe('custom-layer check')
    expect(result.explanations[0].lines).toEqual([
      'This parcel has a 5% intersection with the custom-layer layer. The tolerance is 1%.'
    ])
    expect(result.cavets.isConsentRequired).toBe(true)
  })
})
