import { getUnitByActionCode, unitCompetedFor } from './action-unit.js'

const enabledActions = [
  { code: 'BND1', applicationUnitOfMeasurement: 'm' },
  { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' }
]

describe('getUnitByActionCode', () => {
  test('should map each enabled action code to its configured unit', () => {
    expect(getUnitByActionCode(enabledActions)).toEqual({
      BND1: 'm',
      CMOR1: 'ha'
    })
  })

  test('should return an empty map when no actions are enabled', () => {
    expect(getUnitByActionCode([])).toEqual({})
  })
})

describe('unitCompetedFor', () => {
  const unitByActionCode = getUnitByActionCode(enabledActions)

  test('should use the configured unit for an agreement action', () => {
    const agreementAction = { actionCode: 'BND1', unit: 'm' }

    expect(unitCompetedFor(agreementAction, unitByActionCode)).toBe('m')
  })

  test('should use the configured unit for a sibling action, which has no unit of its own', () => {
    const siblingAction = { code: 'BND1', quantity: 50 }

    expect(unitCompetedFor(siblingAction, unitByActionCode)).toBe('m')
  })

  test('should prefer the configured unit over the unit on the action', () => {
    const agreementAction = { actionCode: 'CMOR1', unit: 'm' }

    expect(unitCompetedFor(agreementAction, unitByActionCode)).toBe('ha')
  })

  test('should fall back to the unit on the action when its code is not configured', () => {
    const legacyAgreementAction = { actionCode: 'BND2', unit: 'm' }

    expect(unitCompetedFor(legacyAgreementAction, unitByActionCode)).toBe('m')
  })

  test('should compete for nothing when the code is not configured and the action has no unit', () => {
    const unconfiguredSibling = { code: 'BND2', quantity: 50 }

    expect(
      unitCompetedFor(unconfiguredSibling, unitByActionCode)
    ).toBeUndefined()
  })
})
