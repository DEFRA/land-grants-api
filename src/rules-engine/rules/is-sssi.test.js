import { rules } from './index.js'

describe('is-sssi', function () {
  test('should return false if the land parcel is not a SSSI', () => {
    const application = {
      areaAppliedFor: 1,
      actionCodeAppliedFor: 'CODE',
      landParcel: {
        area: 1,
        existingAgreements: [],
        intersections: {
          sssi: -1
        }
      }
    }

    const result = rules['is-sssi'](application)
    expect(result).toStrictEqual({
      passed: false,
      message: 'Land parcel is not a SSSI'
    })
  })

  test('should return true if the land parcel is a SSSI', () => {
    const application = {
      areaAppliedFor: 1,
      actionCodeAppliedFor: 'CODE',
      landParcel: {
        area: 1,
        existingAgreements: [],
        intersections: {
          sssi: 1
        }
      }
    }

    const result = rules['is-sssi'](application)
    expect(result).toStrictEqual({
      passed: true
    })
  })
})
