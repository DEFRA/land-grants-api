import { minMaxParcelSize } from './min-max-parcel-size.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'

describe('minMaxParcelSize', () => {
  const name = 'min-max-parcel-size'

  const createApplication = () => ({
    landParcel: {
      parcelSizeSqm: haToSqm(10)
    }
  })

  const createRule = (config = {}) => ({
    name,
    description: 'Check parcel size is within configured size',
    config
  })

  test('should pass when parcel size falls within min max', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeSqm: 50000,
        maximumParcelSizeSqm: 150000
      })
    )

    expect(result.passed).toBe(true)
    expect(result.reason).toEqual('The parcel size is of acceptable size')
  })

  test('should pass when parcel size meets minimum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeSqm: 10000
      })
    )

    expect(result.passed).toBe(true)
  })

  test('should pass when parcel size meets maximum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        maximumParcelSizeSqm: 300000
      })
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when parcel size does not meet minimum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeSqm: 110000
      })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The parcel size is below the minimum configured parcel size 11ha'
    )
  })

  test('should fail when parcel size does not meet maximum required size', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        maximumParcelSizeSqm: 50000
      })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The parcel size is above the maximum configured parcel size 5ha'
    )
  })

  test('should fail when rule is missing config for min and max sizes', () => {
    const result = minMaxParcelSize.execute(createApplication(), createRule({}))

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Missing config for minimum and maximum sizes'
    )
  })

  test('should fail when min is greater than max', () => {
    const result = minMaxParcelSize.execute(
      createApplication(),
      createRule({
        minimumParcelSizeSqm: 50000,
        maximumParcelSizeSqm: 40000
      })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Minimum expected parcel size is greater than configured maximum size'
    )
  })
})
