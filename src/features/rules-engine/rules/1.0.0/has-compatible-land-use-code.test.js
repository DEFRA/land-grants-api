import { hasCompatibleLandUseCode } from './has-compatible-land-use-code.js'

describe('hasCompatibleLandUseCode', () => {
  const name = 'has-compatible-land-use-code'

  const createApplication = (landUseCodes = []) => ({
    landParcel: {
      landUseCodes
    }
  })

  const createRule = (config = {}) => ({
    name,
    description: 'Check parcel has a compatible land use code',
    config
  })

  test('should pass when parcel land use codes include the required code', () => {
    const result = hasCompatibleLandUseCode.execute(
      createApplication(['AR', 'WF03']),
      createRule({ landUseCode: 'WF03' })
    )

    expect(result.passed).toBe(true)
    expect(result.reason).toEqual(
      'Parcel land use code matches the required land use code'
    )
  })

  test('should pass when matching case-insensitively', () => {
    const result = hasCompatibleLandUseCode.execute(
      createApplication(['wf03']),
      createRule({ landUseCode: 'WF03' })
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when parcel land use codes do not include the required code', () => {
    const result = hasCompatibleLandUseCode.execute(
      createApplication(['PG', 'PW']),
      createRule({ landUseCode: 'AR' })
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Parcel does not have a compatible land use code'
    )
  })

  test('should fail when parcel has no land use codes', () => {
    const result = hasCompatibleLandUseCode.execute(
      createApplication([]),
      createRule({ landUseCode: 'AR' })
    )

    expect(result.passed).toBe(false)
  })

  test('should include the name and description in the result', () => {
    const rule = createRule({ landUseCode: 'AR' })
    const result = hasCompatibleLandUseCode.execute(
      createApplication(['AR']),
      rule
    )

    expect(result.name).toEqual(name)
    expect(result.description).toEqual(rule.description)
  })

  test('should include an explanation with the configured land use code', () => {
    const result = hasCompatibleLandUseCode.execute(
      createApplication(['AR']),
      createRule({ landUseCode: 'AR' })
    )

    expect(result.explanations).toEqual([
      {
        title: 'Land use code check',
        lines: ['Land use code AR is required']
      }
    ])
  })
})
