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
            'This parcel has a 49% intersection with the moorland layer. The target is 51%.'
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
            'This parcel has a 50% intersection with the moorland layer. The target is 51%.'
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
            'This parcel has a 48% intersection with the moorland layer. The target is 51%.'
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
})
