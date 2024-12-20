import { intersectionNotMoreThanPercent } from './intersection-not-more-than-percent.js'

describe('intersection-not-more-than-percent', () => {
  test('should pass if the intersection is less than or equal to the maxIntersectionPercent', () => {
    const application = {
      landParcel: {
        intersections: {
          sssi: { intersectingAreaPercentage: 10 }
        }
      }
    }
    const maxIntersectionPercent = 20
    const result = intersectionNotMoreThanPercent('sssi').check(application, {
      maxIntersectionPercent
    })
    expect(result).toEqual({ passed: true })
  })

  test('should fail if the intersection is greater than the maxIntersectionPercent', () => {
    const application = {
      landParcel: {
        intersections: {
          sssi: { intersectingAreaPercentage: 30 }
        }
      }
    }
    const maxIntersectionPercent = 20
    const result = intersectionNotMoreThanPercent('sssi').check(application, {
      maxIntersectionPercent
    })
    expect(result).toEqual({
      passed: false,
      message:
        'The parcel has a 30% intersection with the sssi layer, the maximum is 20%'
    })
  })

  test('should pass if the intersection is equal to the maxIntersectionPercent', () => {
    const application = {
      landParcel: {
        intersections: {
          sssi: { intersectingAreaPercentage: 20 }
        }
      }
    }
    const maxIntersectionPercent = 20
    const result = intersectionNotMoreThanPercent('sssi').check(application, {
      maxIntersectionPercent
    })
    expect(result).toEqual({ passed: true })
  })

  test('should fail if the corrrect intersection is not provided', () => {
    const application = {
      landParcel: {
        intersections: {
          sssi: { intersectingAreaPercentage: 20 }
        }
      }
    }
    const maxIntersectionPercent = 20
    const result = intersectionNotMoreThanPercent('moorland').check(
      application,
      {
        maxIntersectionPercent
      }
    )
    expect(result).toEqual({
      passed: false,
      message:
        'An intersection with the moorland layer was not provided in the application data'
    })
  })
})
