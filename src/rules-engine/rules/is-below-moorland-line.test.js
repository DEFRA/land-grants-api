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
          moorland: 1
        }
      }
    }

    const result = rules['is-below-moorland-line'](application)
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
          moorland: -1
        }
      }
    }

    const result = rules['is-below-moorland-line'](application)
    expect(result).toStrictEqual({
      passed: false,
      message: 'Land parcel is above the moorland line'
    })
  })
})
