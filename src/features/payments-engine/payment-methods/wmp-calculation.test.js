import {
  calculateEligibleArea,
  calculatePayment,
  wmpCalculation
} from './wmp-calculation.js'

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

describe('calculateEligibleArea', () => {
  test('should include all new woodland when it is within the cap', () => {
    // old=80ha, new=10ha, total=90ha, 20% cap=18ha → new(10) ≤ cap(18) → eligible=90ha
    expect(calculateEligibleArea(80, 10, 20)).toBe(90)
  })

  test('should cap new woodland when it exceeds the maximum percentage', () => {
    // old=20ha, new=30ha, total=50ha, 20% cap=10ha → new(30) > cap(10) → eligible=30ha
    expect(calculateEligibleArea(20, 30, 20)).toBe(30)
  })

  test('should include all new woodland when exactly at the cap', () => {
    // old=80ha, new=20ha, total=100ha, 20% cap=20ha → new(20) = cap(20) → eligible=100ha
    expect(calculateEligibleArea(80, 20, 20)).toBe(100)
  })
})

describe('calculatePayment', () => {
  test.each([
    { area: 0.2, expected: 0 },
    { area: 0.4999, expected: 0 },
    { area: 0.5, expected: 1500 },
    { area: 50.5, expected: 1515 },
    { area: 50.9999, expected: 1530 },
    { area: 51, expected: 1530 },
    { area: 51.5, expected: 1545 },
    { area: 100, expected: 3000 },
    { area: 100.0001, expected: 3000 },
    { area: 100.1, expected: 3001.5 },
    { area: 150, expected: 3750 }
  ])(
    'should return £$expected for $area ha eligible area',
    ({ area, expected }) => {
      expect(calculatePayment(area, tiers).payment).toBe(expected)
    }
  )
})

describe('wmpCalculation', () => {
  const createPaymentMethod = () => ({
    name: 'wmp-calculation',
    config: { newWoodlandMaxPercent: 20, tiers }
  })

  const createData = (oldWoodlandAreaHa, newWoodlandAreaHa) => ({
    data: {
      totalParcelArea: oldWoodlandAreaHa + newWoodlandAreaHa,
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      startDate: '2024-01-01'
    }
  })

  describe('execute', () => {
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

    test('should apply the young woodland cap and calculate a tier 2 payment', () => {
      // old=60ha, new=30ha, 20% cap=18ha → eligible=78ha → tier 2 → £1500 + 30*(78-50)=£2340
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(60, 30)
      )

      expect(result.eligibleArea).toBe(78)
      expect(result.payment).toBe(2340)
      expect(result.activePaymentTier).toBe(2)
      expect(result.quantityInActiveTier).toBe(28)
      expect(result.activeTierRatePence).toBe(30)
      expect(result.activeTierFlatRatePence).toBe(1500)
    })

    test('should apply the young woodland cap and calculate a tier 3 payment', () => {
      // old=100ha, new=50ha, 20% cap=30ha → eligible=130ha → tier 3 → £3000 + 15*(130-100)=£3450
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(100, 50)
      )

      expect(result.eligibleArea).toBe(130)
      expect(result.payment).toBe(3450)
      expect(result.activePaymentTier).toBe(3)
      expect(result.quantityInActiveTier).toBe(30)
      expect(result.activeTierRatePence).toBe(15)
      expect(result.activeTierFlatRatePence).toBe(3000)
    })
  })
})
