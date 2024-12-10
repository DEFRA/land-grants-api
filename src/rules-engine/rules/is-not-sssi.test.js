import { rules } from './index.js'

describe('is-not-sssi', function () {
  test('should return true if the land parcel is not a SSSI', () => {
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

    const result = rules['is-not-sssi'](application)
    expect(result).toStrictEqual({ passed: true })
  })

  test('should return false if the land parcel is a SSSI', () => {
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

    const result = rules['is-not-sssi'](application)
    expect(result).toStrictEqual({
      passed: false,
      message: 'Land parcel is a SSSI'
    })
  })
})
