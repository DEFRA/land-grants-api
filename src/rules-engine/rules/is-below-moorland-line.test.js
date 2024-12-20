import { rules } from './index.js'

describe('is-below-moorland-line', function () {
  test('should return true if the land parcel is below the moorland line', () => {
    const application = {
      areaAppliedFor: 1,
      actionCodeAppliedFor: 'CODE',
      landParcel: {
        area: 1,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: 0 }
        }
      }
    }

    // Act
    const result = rules['not-moorland'].check(application, {
      maxIntersectionPercent: 0
    })

    // Assert
    expect(result).toStrictEqual({ passed: true })
  })

  test('should return false if the land parcel is above the moorland line', () => {
    const application = {
      areaAppliedFor: 1,
      actionCodeAppliedFor: 'CODE',
      landParcel: {
        area: 1,
        existingAgreements: [],
        intersections: {
          moorland: { intersectingAreaPercentage: 1 }
        }
      }
    }

    // Act
    const result = rules['not-moorland'].check(application, {
      maxIntersectionPercent: 0
    })

    // Assert
    expect(result).toStrictEqual({
      passed: false,
      message:
        'The parcel has a 1% intersection with the moorland layer, the maximum is 0%'
    })
  })
})
