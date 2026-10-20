import { parcelHasIntersectionWithDataLayer } from './parcel-has-intersection-with-data-layer.js'

describe('parcelHasIntersectionWithDataLayer', () => {
  const createApplication = (intersectionValue) => ({
    landParcel: {
      intersections: {
        moorland: intersectionValue
          ? { intersectingAreaPercentage: intersectionValue }
          : undefined
      }
    }
  })

  const rule = {
    config: {
      layerName: 'moorland',
      minimumIntersectionPercent: 50,
      tolerancePercent: 1
    }
  }

  test('should pass when intersection is greater than or equal to minimumIntersectionPercent - tolerancePercent', () => {
    const application = createApplication(49)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: true,
      reason: 'This parcel is majority on the moorland',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 49% intersection with the moorland layer. The target is 49%.'
          ]
        }
      ]
    })
  })

  test('should pass when intersection is exactly equal to minimumIntersectionPercent', () => {
    const application = createApplication(50)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: true,
      reason: 'This parcel is majority on the moorland',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 50% intersection with the moorland layer. The target is 49%.'
          ]
        }
      ]
    })
  })

  test('should fail when intersection is less than minimumIntersectionPercent - tolerancePercent', () => {
    const application = createApplication(48)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: false,
      reason: 'This parcel is not majority on the moorland',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 48% intersection with the moorland layer. The target is 49%.'
          ]
        }
      ]
    })
  })

  test('should fail when the specified layer does not exist in intersections', () => {
    const application = createApplication(undefined)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: false,
      reason:
        'An intersection with the moorland layer was not provided in the application data',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'An intersection with the moorland layer was not provided in the application data'
          ]
        }
      ]
    })
  })

  test('should use failureMessage when provided and rule fails', () => {
    const ruleWithFailureMessage = {
      config: {
        layerName: 'lfa',
        minimumIntersectionPercent: 100,
        tolerancePercent: 1,
        failureMessage:
          'It is not possible to select this action because the land parcel is not fully within a Less Favoured Area (LFA)'
      }
    }
    const application = {
      landParcel: {
        intersections: {
          lfa: { intersectingAreaPercentage: 80 }
        }
      }
    }
    const result = parcelHasIntersectionWithDataLayer.execute(
      application,
      ruleWithFailureMessage
    )

    expect(result).toEqual({
      name: 'undefined-lfa',
      passed: false,
      reason:
        'It is not possible to select this action because the land parcel is not fully within a Less Favoured Area (LFA)',
      explanations: [
        {
          title: 'lfa check',
          lines: [
            'This parcel has a 80% intersection with the lfa layer. The target is 99%.'
          ]
        }
      ]
    })
  })

  test('should use default reason when failureMessage is provided but rule passes', () => {
    const ruleWithFailureMessage = {
      config: {
        layerName: 'lfa',
        minimumIntersectionPercent: 100,
        tolerancePercent: 1,
        failureMessage:
          'It is not possible to select this action because the land parcel is not fully within a Less Favoured Area (LFA)'
      }
    }
    const application = {
      landParcel: {
        intersections: {
          lfa: { intersectingAreaPercentage: 100 }
        }
      }
    }
    const result = parcelHasIntersectionWithDataLayer.execute(
      application,
      ruleWithFailureMessage
    )

    expect(result).toEqual({
      name: 'undefined-lfa',
      passed: true,
      reason: 'This parcel is majority on the lfa',
      description: undefined,
      explanations: [
        {
          title: 'lfa check',
          lines: [
            'This parcel has a 100% intersection with the lfa layer. The target is 99%.'
          ]
        }
      ]
    })
  })
})
