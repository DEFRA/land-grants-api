import { parcelHasNoIntersectionWithDataLayer } from './parcel-has-no-intersection-with-data-layer.js'

describe('parcelHasNoIntersectionWithDataLayer', () => {
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
      layerName: 'moorland'
    }
  }

  test('should pass when intersection is exactly 0%', () => {
    const application = createApplication(0)
    const result = parcelHasNoIntersectionWithDataLayer.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: true,
      reason: 'This parcel has no intersection with the moorland layer',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 0% intersection with the moorland layer. The target is 0%.'
          ]
        }
      ]
    })
  })

  test('should fail when intersection is greater than 0%', () => {
    const application = createApplication(25)
    const result = parcelHasNoIntersectionWithDataLayer.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'undefined-moorland',
      passed: false,
      reason: 'This parcel has an intersection with the moorland layer',
      explanations: [
        {
          title: 'moorland check',
          lines: [
            'This parcel has a 25% intersection with the moorland layer. The target is 0%.'
          ]
        }
      ]
    })
  })

  test('should fail when the specified layer does not exist in intersections', () => {
    const application = createApplication(undefined)
    const result = parcelHasNoIntersectionWithDataLayer.execute(
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
