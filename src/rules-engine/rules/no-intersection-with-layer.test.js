import { rules } from './index.js'
import { blankIntersections } from '../rulesEngine.d.js'

describe('no-intersection-with-layer', function () {
  test('should pass when no intersection present on parcel', function () {
    // Arrange
    /** @type {Application} */
    const application = {
      areaAppliedFor: 100,
      actionCodeAppliedFor: 'SAM1',
      landParcel: {
        area: 100,
        existingAgreements: [],
        intersections: blankIntersections
      }
    }

    // Acts
    const result = rules['no-intersection-with-layer'](application, {
      layerId: 'sssi',
      tolerancePercentage: 0
    })

    // Assert
    expect(result).toStrictEqual({ passed: true })
  })

  test('should fail when 0.01% intersection with 0% tolerance on layer', function () {
    // Arrange
    /** @type {Application} */
    const application = {
      areaAppliedFor: 100,
      actionCodeAppliedFor: 'SAM1',
      landParcel: {
        area: 100,
        existingAgreements: [],
        intersections: {
          ...blankIntersections,
          sssi: 100
        }
      }
    }

    // Acts
    const result = rules['no-intersection-with-layer'](application, {
      layerId: 'sssi',
      tolerancePercentage: 0
    })

    // Assert
    expect(result).toStrictEqual({ passed: false })
  })

  test('should pass when 0.1% intersection with disallowed layer and 0.1% tolerance', function () {
    // Arrange
    /** @type {Application} */
    const application = {
      areaAppliedFor: 100,
      actionCodeAppliedFor: 'SAM1',
      landParcel: {
        area: 100,
        existingAgreements: [],
        intersections: {
          ...blankIntersections,
          sssi: 0.1
        }
      }
    }

    // Acts
    const result = rules['no-intersection-with-layer'](application, {
      layerId: 'sssi',
      tolerancePercentage: 0.1
    })

    // Assert
    expect(result).toStrictEqual({ passed: true })
  })
})

/** @import { Application } from '../rulesEngine.d.js' */
