import { minMaxParcelSize } from './min-max-parcel-size.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'

describe('minMaxParcelSize', () => {
  const createApplication = () => ({
    landParcel: {
      availableAreaSqm: haToSqm(10)
    }
  })

  const createRule = (config = {}, name = 'min-max-parcel-size') => ({
    name,
    description: 'Check parcel size is within configured size',
    config
  })

  test('should pass when parcel size falls within min max', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeHa: 5,
        maximumParcelSizeHa: 15
      })
    )

    expect(result.passed).toBe(true)
    expect(result.reason).toEqual('The parcel size is of acceptable size')
  })

  test('should pass when parcel size meets minimum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeHa: 10
      })
    )

    expect(result.passed).toBe(true)
  })

  test('should pass when parcel size meets maximum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        maximumParcelSizeHa: 30
      })
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when parcel size does not meet minimum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeHa: 11
      })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The parcel is below the minimum elligble parcel size'
    )
  })

  test('should fail when parcel size does not meet maximum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        maximumParcelSizeHa: 5
      })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The parcel is above the maximum elligble parcel size'
    )
  })
})
