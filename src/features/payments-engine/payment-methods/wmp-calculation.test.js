import { readFileSync } from 'node:fs'
import { wmpCalculation } from './wmp-calculation.js'
import { haToSqm } from '../../common/helpers/measurement.js'
import { parse } from 'csv-parse/sync'

const fixtureScenarios = parse(
  readFileSync(new URL('../fixture/wmp-calculation.csv', import.meta.url)),
  {
    columns: [
      'scenario',
      'oldWoodlandAreaHa',
      'newWoodlandAreaHa',
      false,
      false,
      'eligibleAreaHa',
      'payment'
    ],
    from_line: 2,
    trim: true,
    skip_empty_lines: true,
    cast: (value, { column }) => (column === 'scenario' ? value : Number(value))
  }
)

const tiers = [
  {
    lowerLimitHa: 0.5,
    upperLimitHa: 50,
    flatRateGbp: 1500,
    ratePerUnitGbp: 0
  },
  {
    lowerLimitHa: 50,
    upperLimitHa: 100,
    flatRateGbp: 1500,
    ratePerUnitGbp: 30
  },
  {
    lowerLimitHa: 100,
    upperLimitHa: null,
    flatRateGbp: 3000,
    ratePerUnitGbp: 15
  }
]

describe('wmpCalculation', () => {
  const createPaymentMethod = () => ({
    name: 'wmp-calculation',
    config: { newWoodlandMaxPercent: 20, tiers }
  })

  const createData = (oldWoodlandAreaHa, newWoodlandAreaHa) => ({
    data: {
      totalParcelArea: oldWoodlandAreaHa + newWoodlandAreaHa,
      oldWoodlandAreaSqm: haToSqm(oldWoodlandAreaHa),
      newWoodlandAreaSqm: haToSqm(newWoodlandAreaHa),
      startDate: '2024-01-01'
    }
  })

  describe('execute with old and new woodland area', () => {
    test('should return £0 and no active tier when eligible area is below the minimum threshold', () => {
      // old=0.3ha, new=0ha → eligible=0.3ha (< 0.5) → no tier
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(0.3, 0)
      )

      expect(result.eligibleArea).toBe(0.3)
      expect(result.payment).toBe(0)
      expect(result.activePaymentTier).toBe(0)
      expect(result.quantityInActiveTier).toBe(0)
      expect(result.activeTierRatePence).toBe(0)
      expect(result.activeTierFlatRatePence).toBe(0)
    })

    test('should apply the young woodland cap and calculate a tier 1 payment', () => {
      // old=40ha, new=0ha → eligible=40ha → tier 1 → flat £1500, rate £0/ha
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(40, 0)
      )

      expect(result.eligibleArea).toBe(40)
      expect(result.payment).toBe(1500)
      expect(result.activePaymentTier).toBe(1)
      expect(result.quantityInActiveTier).toBe(40)
      expect(result.activeTierRatePence).toBe(0)
      expect(result.activeTierFlatRatePence).toBe(1500)
    })

    test.each(fixtureScenarios)(
      'fixture scenario $scenario: old=$oldWoodlandAreaHa ha, new=$newWoodlandAreaHa ha → eligible=$eligibleAreaHa ha, £$payment',
      ({ oldWoodlandAreaHa, newWoodlandAreaHa, eligibleAreaHa, payment }) => {
        const result = wmpCalculation.execute(
          createPaymentMethod(),
          createData(oldWoodlandAreaHa, newWoodlandAreaHa)
        )
        expect(result.eligibleArea).toBe(eligibleAreaHa)
        expect(result.payment).toBe(payment)
      }
    )
  })

  describe('execute with total woodland area', () => {
    test('should return £0 and no active tier when eligible area is below the minimum threshold', () => {
      // totalWoodlandAreaSqm=0.3ha → eligible=0.3ha (< 0.5) → no tier
      const result = wmpCalculation.execute(createPaymentMethod(), {
        data: {
          totalWoodlandAreaSqm: 3000
        }
      })

      expect(result.eligibleArea).toBe(0.3)
      expect(result.payment).toBe(0)
      expect(result.activePaymentTier).toBe(0)
      expect(result.quantityInActiveTier).toBe(0)
      expect(result.activeTierRatePence).toBe(0)
      expect(result.activeTierFlatRatePence).toBe(0)
    })

    test('should apply to all woodland area and calculate a tier 1 payment', () => {
      // totalWoodlandAreaSqm=400000 → eligible=40ha → tier 1 → flat £1500, rate £0/ha
      const result = wmpCalculation.execute(createPaymentMethod(), {
        data: {
          totalWoodlandAreaSqm: 400000
        }
      })

      expect(result.eligibleArea).toBe(40)
      expect(result.payment).toBe(1500)
      expect(result.activePaymentTier).toBe(1)
      expect(result.quantityInActiveTier).toBe(40)
      expect(result.activeTierRatePence).toBe(0)
      expect(result.activeTierFlatRatePence).toBe(1500)
    })

    test('should apply to all woodland area and calculate a tier 2 payment', () => {
      // totalWoodlandAreaSqm=780000 → eligible=78ha → tier 2 → £1500 + 30*(78-50)=£2340
      const result = wmpCalculation.execute(createPaymentMethod(), {
        data: {
          totalWoodlandAreaSqm: 780000
        }
      })

      expect(result.eligibleArea).toBe(78)
      expect(result.payment).toBe(2340)
      expect(result.activePaymentTier).toBe(2)
      expect(result.quantityInActiveTier).toBe(28)
      expect(result.activeTierRatePence).toBe(30)
      expect(result.activeTierFlatRatePence).toBe(1500)
    })

    test('should apply to all woodland area and calculate a tier 3 payment', () => {
      // totalWoodlandAreaSqm=1500000 → eligible=150ha → tier 3 → £3000 + 15*(150-100)=£3750
      const result = wmpCalculation.execute(createPaymentMethod(), {
        data: { totalWoodlandAreaSqm: 1500000 }
      })

      expect(result.eligibleArea).toBe(150)
      expect(result.payment).toBe(3750)
      expect(result.activePaymentTier).toBe(3)
      expect(result.quantityInActiveTier).toBe(50)
      expect(result.activeTierRatePence).toBe(15)
      expect(result.activeTierFlatRatePence).toBe(3000)
    })
  })
})
