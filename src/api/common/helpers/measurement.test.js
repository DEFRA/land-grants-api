import { sqmToHaRounded } from './measurement.js'

describe('sqmToHaRounded', () => {
  describe('normal conversions', () => {
    test('converts 10000 sqm to 1 hectare with 4 decimal places', () => {
      expect(sqmToHaRounded(10000)).toBe(1)
    })

    test('converts 50000 sqm to 5 hectares with 4 decimal places', () => {
      expect(sqmToHaRounded(50000)).toBe(5)
    })

    test('converts 12345 sqm to 1.2345 hectares with 4 decimal places', () => {
      expect(sqmToHaRounded(12345)).toBe(1.2345)
    })

    test('converts 12349 sqm to 1.2349 hectares', () => {
      expect(sqmToHaRounded(12349)).toBe(1.2349)
    })

    test('converts 12350 sqm to 1.235 hectares', () => {
      expect(sqmToHaRounded(12350)).toBe(1.235)
    })

    test('converts 12345.6789 sqm with high precision', () => {
      expect(sqmToHaRounded(12345.6789)).toBe(1.2346)
    })
  })

  describe('edge cases', () => {
    test('handles 0 sqm', () => {
      expect(sqmToHaRounded(0)).toBe(0)
    })

    test('handles very small areas (less than 1 sqm)', () => {
      expect(sqmToHaRounded(0.5)).toBe(0.0001)
    })

    test('handles very small areas (1 sqm)', () => {
      expect(sqmToHaRounded(1)).toBe(0.0001)
    })

    test('handles very large areas', () => {
      expect(sqmToHaRounded(1000000)).toBe(100)
    })

    test('handles decimal input', () => {
      expect(sqmToHaRounded(12345.67)).toBe(1.2346)
    })

    test('handles negative numbers', () => {
      expect(sqmToHaRounded(-10000)).toBe(-1)
    })
  })

  describe('invalid input handling', () => {
    test('returns 0 for null input', () => {
      expect(sqmToHaRounded(null)).toBe((0).toFixed(2))
    })

    test('returns 0 for undefined input', () => {
      expect(sqmToHaRounded(undefined)).toBe((0).toFixed(2))
    })

    test('returns converted value for valid numeric string input', () => {
      expect(sqmToHaRounded('12345')).toBe(1.2345)
    })

    test('returns 0 for boolean input', () => {
      expect(sqmToHaRounded(true)).toBe((0).toFixed(2))
    })

    test('returns 0 for object input', () => {
      expect(sqmToHaRounded({})).toBe((0).toFixed(2))
    })

    test('returns 0 for array input', () => {
      expect(sqmToHaRounded([12345])).toBe((0).toFixed(2))
    })

    test('returns 0 for NaN input', () => {
      expect(sqmToHaRounded(NaN)).toBe((0).toFixed(2))
    })
  })

  describe('string input handling', () => {
    test('converts valid numeric string to hectares', () => {
      expect(sqmToHaRounded('10000')).toBe(1)
    })

    test('converts decimal string to hectares', () => {
      expect(sqmToHaRounded('12345.67')).toBe(1.2346)
    })

    test('converts negative string to hectares', () => {
      expect(sqmToHaRounded('-10000')).toBe(-1)
    })

    test('converts scientific notation string', () => {
      expect(sqmToHaRounded('1e4')).toBe(1)
    })

    test('converts zero string', () => {
      expect(sqmToHaRounded('0')).toBe(0)
    })

    test('returns 0 for empty string', () => {
      expect(sqmToHaRounded('')).toBe(0)
    })

    test('returns 0 for whitespace-only string', () => {
      expect(sqmToHaRounded('   ')).toBe(0)
    })

    test('returns 0 for non-numeric string', () => {
      expect(sqmToHaRounded('abc')).toBe((0).toFixed(2))
    })

    test('returns 0 for mixed alphanumeric string', () => {
      expect(sqmToHaRounded('123abc')).toBe((0).toFixed(2))
    })

    test('returns 0 for string with units', () => {
      expect(sqmToHaRounded('12345 sqm')).toBe((0).toFixed(2))
    })

    test('handles string with leading/trailing whitespace', () => {
      expect(sqmToHaRounded('  10000  ')).toBe(1)
    })

    test('handles string with plus sign', () => {
      expect(sqmToHaRounded('+10000')).toBe(1)
    })

    test('returns 0 for multiple decimal points', () => {
      expect(sqmToHaRounded('123.45.67')).toBe((0).toFixed(2))
    })

    test('returns 0 for string with special characters', () => {
      expect(sqmToHaRounded('12,345')).toBe((0).toFixed(2))
    })

    test('handles very large number as string', () => {
      expect(sqmToHaRounded('1000000')).toBe(100)
    })

    test('handles very small number as string', () => {
      expect(sqmToHaRounded('0.5')).toBe(0.0001)
    })
  })

  describe('precision and rounding with 4 decimal places', () => {
    test('rounds correctly to 4 decimal places', () => {
      expect(sqmToHaRounded(12345.6789)).toBe(1.2346) // 1.23456789 rounds to 1.2346
      expect(sqmToHaRounded(12344.4444)).toBe(1.2344) // 1.23444444 rounds to 1.2344
      expect(sqmToHaRounded(12344.5555)).toBe(1.2345) // 1.23445555 rounds to 1.2345
    })

    test('handles precise calculations', () => {
      expect(sqmToHaRounded(1)).toBe(0.0001)
      expect(sqmToHaRounded(5)).toBe(0.0005)
      expect(sqmToHaRounded(9999)).toBe(0.9999)
    })

    test('handles rounding at different thresholds', () => {
      expect(sqmToHaRounded(12344.99994)).toBe(1.2345) // rounds up
      expect(sqmToHaRounded(12344.99995)).toBe(1.2345) // rounds up
      expect(sqmToHaRounded(12345.00001)).toBe(1.2345) // rounds down
    })
  })

  describe('real world scenarios', () => {
    test('converts typical field size (2.5 hectares)', () => {
      expect(sqmToHaRounded(25000)).toBe(2.5)
    })

    test('converts small garden (100 sqm)', () => {
      expect(sqmToHaRounded(100)).toBe(0.01)
    })

    test('converts large farm (500 hectares)', () => {
      expect(sqmToHaRounded(5000000)).toBe(500)
    })

    test('converts complex area measurements', () => {
      expect(sqmToHaRounded(12345.6789)).toBe(1.2346)
      expect(sqmToHaRounded(987654.321)).toBe(98.7654)
    })

    test('converts areas requiring high precision', () => {
      expect(sqmToHaRounded(1.23456)).toBe(0.0001) // Very small area
      expect(sqmToHaRounded(99.9999)).toBe(0.01) // Almost 0.01 hectare
    })
  })
})
