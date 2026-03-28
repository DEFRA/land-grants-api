import { wmpCalculation } from './wmp-calculation.js'

describe('wmpCalculation', () => {
  const createPaymentMethod = () => ({
    name: 'wmp-calculation',
    config: {
      tiers: [
        {
          'flat-rate-gbp': 1500,
          'rate-per-unit-gbp': 0,
          'lower-limit-exclusive-ha': 0.5
        },
        {
          'flat-rate-gbp': 1500,
          'rate-per-unit-gbp': 30,
          'lower-limit-exclusive-ha': 50.9999
        },
        {
          'flat-rate-gbp': 3000,
          'rate-per-unit-gbp': 15,
          'lower-limit-exclusive-ha': 100
        }
      ],
      'new-woodland-max-percent': 20
    }
  })

  const createData = (oldWoodlandAreaHa, newWoodlandAreaHa) => ({
    data: {
      totalParcelArea: oldWoodlandAreaHa + newWoodlandAreaHa,
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      startDate: '2024-01-01'
    }
  })

  describe('eligible area calculation (young woodland cap)', () => {
    test('should include all new woodland when it is within the 20% cap', () => {
      // old=80ha, new=10ha, total=90ha, 20% cap=18ha → new(10) ≤ cap(18)
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(80, 10)
      )

      expect(result.eligibleArea).toBe(90)
    })

    test('should cap new woodland when it exceeds 20% of total woodland', () => {
      // old=20ha, new=30ha, total=50ha, 20% cap=10ha → new(30) > cap(10)
      // eligible new = 10ha → eligible area = 20 + 10 = 30ha
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(20, 30)
      )

      expect(result.eligibleArea).toBe(30)
    })

    test('should include all new woodland when it is exactly at the 20% cap', () => {
      // old=80ha, new=20ha, total=100ha, 20% cap=20ha → new(20) = cap(20)
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(80, 20)
      )

      expect(result.eligibleArea).toBe(100)
    })
  })

  describe('payment calculation (tiers)', () => {
    test('should return £0 when eligible area is at or below the minimum 0.5ha', () => {
      // old=0.3ha, new=0.1ha → eligible=0.4ha (below 0.5ha threshold)
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(0.3, 0.1)
      )

      expect(result.payment).toBe(0)
    })

    test('should return flat rate £1500 for eligible area in tier 1 (0.5ha to 51ha)', () => {
      // old=20ha, new=5ha → eligible=25ha → tier 1: flat £1500
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(20, 5)
      )

      expect(result.payment).toBe(1500)
    })

    test('should return £1500 plus £30 per ha above the tier 2 threshold for eligible area between 51ha and 100ha', () => {
      // old=75ha, new=5ha → eligible=80ha → tier 2: 1500 + 30*(80-50.9999) ≈ £2370
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(75, 5)
      )

      expect(result.payment).toBe(2370)
    })

    test('should return £3000 plus £15 per ha above 100ha for eligible area over 100ha', () => {
      // old=90ha, new=20ha, total=110ha, 20% cap=22ha → new(20) ≤ cap(22)
      // eligible=110ha → tier 3: 3000 + 15*(110-100) = £3150
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(90, 20)
      )

      expect(result.payment).toBe(3150)
    })
  })

  describe('combined eligible area and payment calculation', () => {
    test('should apply the young woodland cap then calculate the correct payment tier', () => {
      // old=100ha, new=50ha, total=150ha, 20% cap=30ha → new(50) > cap(30)
      // eligible = 100 + 30 = 130ha → tier 3: 3000 + 15*(130-100) = £3450
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(100, 50)
      )

      expect(result.eligibleArea).toBe(130)
      expect(result.payment).toBe(3450)
    })

    test('should return £0 payment when cap reduces eligible area below the minimum threshold', () => {
      // old=0.2ha, new=2ha, total=2.2ha, 20% cap=0.44ha → new(2) > cap(0.44)
      // eligible = 0.2 + 0.44 = 0.64ha → tier 1: flat £1500
      const result = wmpCalculation.execute(
        createPaymentMethod(),
        createData(0.2, 2)
      )

      expect(result.eligibleArea).toBeCloseTo(0.64, 2)
      expect(result.payment).toBe(1500)
    })
  })
})
