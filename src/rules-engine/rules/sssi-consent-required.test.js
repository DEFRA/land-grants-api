import { sssiConsentRequired } from './sssi-consent-required.js'

describe('sssiConsentRequired', () => {
  const createApplication = () => ({
    landParcel: {}
  })

  const createRule = (
    name = 'sssi-consent-required',
    layerName = 'sssi',
    caveatDescription = 'A parcel requires SSSI consent from Natural England'
  ) => ({
    name,
    description: 'SSSI consent check',
    config: {
      layerName,
      caveatDescription
    }
  })

  test('should pass when consent is not required', () => {
    const application = createApplication()
    const rule = createRule()
    const result = sssiConsentRequired.execute(application, rule)

    expect(result).toEqual({
      name: 'sssi-consent-required-sssi',
      passed: true,
      reason: 'No parcel requires SSSI consent from Natural England',
      description: 'SSSI consent check',
      explanations: [
        {
          title: 'sssi check',
          lines: []
        }
      ]
    })
  })
})
