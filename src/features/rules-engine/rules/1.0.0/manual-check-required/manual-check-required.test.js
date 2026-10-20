import { manualCheckRequired } from './manual-check-required.js'

describe('manualCheckRequired', () => {
  const createApplication = (overrides = {}) => ({
    parcelId: '9215',
    sheetId: 'SD5649',
    actionCode: 'WBD1',
    ...overrides
  })

  const createRule = (
    name = 'pond-check-required',
    caveatDescription = 'A manual pond check is required'
  ) => ({
    name,
    type: 'manual-check-required',
    description: 'Manual check that the pond is not on SSSI land',
    config: { caveatDescription }
  })

  test('always passes', () => {
    const result = manualCheckRequired.execute(
      createApplication(),
      createRule()
    )

    expect(result.passed).toBe(true)
  })

  test('always attaches a caveat using the rule name as the caveat code', () => {
    const result = manualCheckRequired.execute(
      createApplication(),
      createRule()
    )

    expect(result.caveat).toEqual({
      code: 'pond-check-required',
      description: 'A manual pond check is required',
      metadata: {
        actionCode: 'WBD1',
        parcelId: '9215',
        sheetId: 'SD5649'
      }
    })
  })

  test('is reusable for a different action via a different rule name/description', () => {
    const application = createApplication({
      actionCode: 'ABC1',
      parcelId: '1111',
      sheetId: 'AB1234'
    })
    const rule = createRule(
      'abc1-check-required',
      'A manual ABC1 check is required'
    )

    const result = manualCheckRequired.execute(application, rule)

    expect(result.caveat).toEqual({
      code: 'abc1-check-required',
      description: 'A manual ABC1 check is required',
      metadata: {
        actionCode: 'ABC1',
        parcelId: '1111',
        sheetId: 'AB1234'
      }
    })
  })

  test('returns the rule description on the result', () => {
    const result = manualCheckRequired.execute(
      createApplication(),
      createRule()
    )

    expect(result.description).toBe(
      'Manual check that the pond is not on SSSI land'
    )
  })
})
