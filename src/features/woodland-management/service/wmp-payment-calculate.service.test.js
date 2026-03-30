import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executeRulesForPaymentCalculationWMP,
  sumTotalLandAreaSqm
} from './wmp-payment-calculate.service.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

vi.mock('~/src/features/rules-engine/rulesEngine.js')
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({ rules: {} }))

const createMockParcels = () => [{ area: 10 }, { area: 20 }, { area: 30 }]

const createMockAction = () => ({
  code: 'PA3',
  rules: [
    {
      name: 'parcel-has-minimum-eligibility-for-woodland-management-plan',
      version: '1.0.0'
    }
  ]
})

describe('sumTotalLandAreaSqm', () => {
  it('should return the sum of all parcel areas', () => {
    expect(sumTotalLandAreaSqm(createMockParcels())).toBe(60)
  })

  it('should return 0 for an empty parcel array', () => {
    expect(sumTotalLandAreaSqm([])).toBe(0)
  })

  it('should skip null parcels and sum the rest', () => {
    expect(sumTotalLandAreaSqm([{ area: 10 }, null, { area: 20 }])).toBe(30)
  })

  it('should return 0 when all parcels are null', () => {
    expect(sumTotalLandAreaSqm([null, null])).toBe(0)
  })
})

describe('executeRulesForPaymentCalculationWMP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executeRules.mockReturnValue({ passed: true, results: [] })
  })

  it('should call executeRules with the correct application data and action rules', () => {
    executeRulesForPaymentCalculationWMP(
      createMockParcels(),
      createMockAction(),
      5,
      3
    )

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      {
        oldWoodlandAreaHa: 5,
        newWoodlandAreaHa: 3,
        totalParcelArea: 60
      },
      createMockAction().rules
    )
  })

  it('should return the ruleResult and totalParcelArea', () => {
    const mockRuleResult = {
      passed: true,
      results: [{ name: 'rule1', passed: true }]
    }
    executeRules.mockReturnValue(mockRuleResult)

    const result = executeRulesForPaymentCalculationWMP(
      createMockParcels(),
      createMockAction(),
      5,
      3
    )

    expect(result).toEqual({
      ruleResult: mockRuleResult,
      totalParcelArea: 60
    })
  })

  it('should compute totalParcelArea from the parcel areas', () => {
    const parcels = [{ area: 15 }, { area: 25 }]

    const { totalParcelArea } = executeRulesForPaymentCalculationWMP(
      parcels,
      createMockAction(),
      5,
      3
    )

    expect(totalParcelArea).toBe(40)
  })

  it('should handle null parcels when computing totalParcelArea', () => {
    const parcels = [{ area: 10 }, null, { area: 20 }]

    const { totalParcelArea } = executeRulesForPaymentCalculationWMP(
      parcels,
      createMockAction(),
      5,
      3
    )

    expect(totalParcelArea).toBe(30)
  })
})
