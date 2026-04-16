import { parcelIntersectionDoesNotExceedMaximumForDataLayer } from './parcel-intersection-does-not-exceed-maximum-for-data-layer.js'

describe('parcelIntersectionDoesNotExceedMaximumForDataLayer', () => {
  const createApplication = (intersectionValue) => ({
    landParcel: {
      intersections: {
        moorland:
          intersectionValue !== undefined
            ? { intersectingAreaPercentage: intersectionValue }
            : undefined
      }
    }
  })

  const rule = {
    config: {
      layerName: 'moorland',
      maximumIntersectionPercent: 0,
      tolerancePercent: 1
    }
  }

  test('should pass when intersection is exactly at maximumIntersectionPercent + tolerancePercent', () => {
    const application = createApplication(1)
    const result = parcelIntersectionDoesNotExceedMaximumForDataLayer.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: true,
      reason:
        'This parcel is within the maximum allowed intersection with the moorland layer',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 1% intersection with the moorland layer. The target is 1%.'
          ]
        }
      ]
    })
  })

  test('should fail when intersection is greater than maximumIntersectionPercent + tolerancePercent', () => {
    const application = createApplication(2)
    const result = parcelIntersectionDoesNotExceedMaximumForDataLayer.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: false,
      reason:
        'This parcel exceeds the maximum allowed intersection with the moorland layer',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 2% intersection with the moorland layer. The target is 1%.'
          ]
        }
      ]
    })
  })

  test('should use configurable maximumIntersectionPercent with tolerancePercent', () => {
    const application = createApplication(12)
    const customRule = {
      config: {
        layerName: 'moorland',
        maximumIntersectionPercent: 10,
        tolerancePercent: 2
      }
    }

    const result = parcelIntersectionDoesNotExceedMaximumForDataLayer.execute(
      application,
      customRule
    )

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: true,
      reason:
        'This parcel is within the maximum allowed intersection with the moorland layer',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 12% intersection with the moorland layer. The target is 12%.'
          ]
        }
      ]
    })
  })

  test('should fail when the specified layer does not exist in intersections', () => {
    const application = createApplication(undefined)
    const result = parcelIntersectionDoesNotExceedMaximumForDataLayer.execute(
      application,
      rule
    )

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
