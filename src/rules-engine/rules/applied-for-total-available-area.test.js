import { appliedForTotalAvailableArea } from './applied-for-total-available-area.js'

describe('appliedForTotalAvailableArea', () => {
  const createApplication = (areaAppliedFor, parcelArea) => ({
    areaAppliedFor,
    landParcel: {
      area: parcelArea
    }
  })

  test('should pass when area applied for matches parcel area', () => {
    const application = createApplication('10.5', '10.5')
    const result = appliedForTotalAvailableArea.execute(application)

    expect(result).toEqual({ passed: true })
  })

  test('should pass when area applied for matches parcel area with different types but same value', () => {
    const application = createApplication(10.5, '10.5')
    const result = appliedForTotalAvailableArea.execute(application)

    expect(result).toEqual({ passed: true })
  })

  test('should fail when area applied for does not match parcel area', () => {
    const application = createApplication('9.5', '10.5')
    const result = appliedForTotalAvailableArea.execute(application)

    expect(result).toEqual({
      passed: false,
      message: 'Area applied for (9.5ha) does not match parcel area (10.5ha)'
    })
  })

  test('should handle string and number comparison correctly', () => {
    const application = createApplication(10, '10.0')
    const result = appliedForTotalAvailableArea.execute(application)

    expect(result).toEqual({ passed: true })
  })
})
