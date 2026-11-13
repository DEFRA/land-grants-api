import { wmpCalculation } from './wmp-calculation.js'
import { haToSqm } from '../../common/helpers/measurement.js'

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
    config: { newWoodlandMaxPercent: 25, tiers }
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

    test('Actual new woodland is more than maximum eligible new woodland', () => {
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(100, 500)
      )

      expect(result.eligibleArea).toBe(125)
      expect(result.payment).toBe(3375)
      expect(result.activePaymentTier).toBe(3)
      expect(result.quantityInActiveTier).toBe(25)
      expect(result.activeTierRatePence).toBe(15)
      expect(result.activeTierFlatRatePence).toBe(3000)
    })

    test('Actual new woodland is more than maximum eligible new woodland and on the 100ha limit', () => {
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(80, 80)
      )

      expect(result.eligibleArea).toBe(100)
      expect(result.payment).toBe(3000)
      expect(result.activePaymentTier).toBe(3)
      expect(result.quantityInActiveTier).toBe(0)
      expect(result.activeTierRatePence).toBe(15)
      expect(result.activeTierFlatRatePence).toBe(3000)
    })

    test('Actual new woodland is more than maximum eligible new woodland and just above the 100ha limit', () => {
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(81, 500)
      )

      expect(result.eligibleArea).toBe(101.25)
      expect(result.payment).toBe(3018.75)
      expect(result.activePaymentTier).toBe(3)
      expect(result.quantityInActiveTier).toBe(1.25)
      expect(result.activeTierRatePence).toBe(15)
      expect(result.activeTierFlatRatePence).toBe(3000)
    })

    test('Actual new woodland is less than maximum eligible new woodland', () => {
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(81, 10)
      )

      expect(result.eligibleArea).toBe(91)
      expect(result.payment).toBe(2730)
      expect(result.activePaymentTier).toBe(2)
      expect(result.quantityInActiveTier).toBe(41)
      expect(result.activeTierRatePence).toBe(30)
      expect(result.activeTierFlatRatePence).toBe(1500)
    })
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
