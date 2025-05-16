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

  test('should pass when intersection is less than or equal to minimumIntersectionPercent + tolerancePercent', () => {
    const application = createApplication(51)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({ passed: true })
  })

  test('should pass when intersection is exactly equal to minimumIntersectionPercent + tolerancePercent', () => {
    const application = createApplication(51)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({ passed: true })
  })

  test('should fail when intersection is greater than minimumIntersectionPercent + tolerancePercent', () => {
    const application = createApplication(52)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      passed: false,
      message:
        'The parcel has a 52% intersection with the moorland layer, the maximum is 50% with a tolerance of 1%'
    })
  })

  test('should fail when the specified layer does not exist in intersections', () => {
    const application = createApplication(undefined)
    const result = parcelHasIntersectionWithDataLayer.execute(application, rule)

    expect(result).toEqual({
      passed: false,
      message:
        'An intersection with the moorland layer was not provided in the application data'
    })
  })
})
