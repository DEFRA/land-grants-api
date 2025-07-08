import { sqmToHaRounded, haToSqm } from './measurement.js'

describe('sqmToHaRounded', () => {
  describe('normal conversions', () => {
    test('converts 10000 sqm to 1 hectare with 8 decimal places', () => {
      expect(sqmToHaRounded(10000)).toBe(1)
    })

    test('converts 50000 sqm to 5 hectares with 8 decimal places', () => {
      expect(sqmToHaRounded(50000)).toBe(5)
    })

    test('converts 12345 sqm to 1.2345 hectares with 8 decimal places', () => {
      expect(sqmToHaRounded(12345)).toBe(1.2345)
    })

    test('converts 12349 sqm to 1.2349 hectares', () => {
      expect(sqmToHaRounded(12349)).toBe(1.2349)
    })

    test('converts 12350 sqm to 1.235 hectares', () => {
      expect(sqmToHaRounded(12350)).toBe(1.235)
    })

    test('converts 12345.6789 sqm with high precision', () => {
      expect(sqmToHaRounded(12345.6789)).toBe(1.23456789)
    })
  })

  describe('edge cases', () => {
    test('handles 0 sqm', () => {
      expect(sqmToHaRounded(0)).toBe(0)
    })

    test('handles very small areas (less than 1 sqm)', () => {
      expect(sqmToHaRounded(0.5)).toBe(0.00005)
    })

    test('handles very small areas (1 sqm)', () => {
      expect(sqmToHaRounded(1)).toBe(0.0001)
    })

    test('handles very large areas', () => {
      expect(sqmToHaRounded(1000000)).toBe(100)
    })

    test('handles decimal input', () => {
      expect(sqmToHaRounded(12345.67)).toBe(1.234567)
    })

    test('handles negative numbers', () => {
      expect(sqmToHaRounded(-10000)).toBe(-1)
    })
  })

  describe('invalid input handling', () => {
    test('returns 0 for null input', () => {
      expect(sqmToHaRounded(null)).toBe(0)
    })

    test('returns 0 for undefined input', () => {
      expect(sqmToHaRounded(undefined)).toBe(0)
    })

    test('returns converted value for valid numeric string input', () => {
      expect(sqmToHaRounded('12345')).toBe(1.2345)
    })

    test('returns 0 for boolean input', () => {
      expect(sqmToHaRounded(true)).toBe(0)
    })

    test('returns 0 for object input', () => {
      expect(sqmToHaRounded({})).toBe(0)
    })

    test('returns 0 for array input', () => {
      expect(sqmToHaRounded([12345])).toBe(0)
    })

    test('returns 0 for NaN input', () => {
      expect(sqmToHaRounded(NaN)).toBe(0)
    })
  })

  describe('string input handling', () => {
    test('converts valid numeric string to hectares', () => {
      expect(sqmToHaRounded('10000')).toBe(1)
    })

    test('converts decimal string to hectares', () => {
      expect(sqmToHaRounded('12345.67')).toBe(1.234567)
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
      expect(sqmToHaRounded('abc')).toBe(0)
    })

    test('returns 0 for mixed alphanumeric string', () => {
      expect(sqmToHaRounded('123abc')).toBe(0)
    })

    test('returns 0 for string with units', () => {
      expect(sqmToHaRounded('12345 sqm')).toBe(0)
    })

    test('handles string with leading/trailing whitespace', () => {
      expect(sqmToHaRounded('  10000  ')).toBe(1)
    })

    test('handles string with plus sign', () => {
      expect(sqmToHaRounded('+10000')).toBe(1)
    })

    test('returns 0 for multiple decimal points', () => {
      expect(sqmToHaRounded('123.45.67')).toBe(0)
    })

    test('returns 0 for string with special characters', () => {
      expect(sqmToHaRounded('12,345')).toBe(0)
    })

    test('handles very large number as string', () => {
      expect(sqmToHaRounded('1000000')).toBe(100)
    })

    test('handles very small number as string', () => {
      expect(sqmToHaRounded('0.5')).toBe(0.00005)
    })
  })

  describe('precision and rounding with 8 decimal places', () => {
    test('rounds correctly to 8 decimal places', () => {
      expect(sqmToHaRounded(12345.6789)).toBe(1.23456789) // 1.23456789 exactly
      expect(sqmToHaRounded(12344.4444)).toBe(1.23444444) // 1.23444444 exactly
      expect(sqmToHaRounded(12344.5555)).toBe(1.23445555) // 1.23445555 exactly
    })

    test('handles precise calculations', () => {
      expect(sqmToHaRounded(1)).toBe(0.0001)
      expect(sqmToHaRounded(5)).toBe(0.0005)
      expect(sqmToHaRounded(9999)).toBe(0.9999)
    })

    test('handles rounding at different thresholds', () => {
      expect(sqmToHaRounded(12344.99994)).toBe(1.23449999) // 8 decimal places
      expect(sqmToHaRounded(12344.99995)).toBe(1.2345) // rounds to 8 decimal places
      expect(sqmToHaRounded(12345.00001)).toBe(1.2345) // rounds to 8 decimal places
    })

    test('handles very precise inputs requiring 8 decimal place rounding', () => {
      // Test cases that specifically exercise 8 decimal place precision
      expect(sqmToHaRounded(12345.67891234)).toBe(1.23456789) // rounds to 8 decimal places
      expect(sqmToHaRounded(12345.678912345)).toBe(1.23456789) // rounds to 8 decimal places
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
      expect(sqmToHaRounded(12345.6789)).toBe(1.23456789)
      expect(sqmToHaRounded(987654.321)).toBe(98.7654321)
    })

    test('converts areas requiring high precision', () => {
      expect(sqmToHaRounded(1.23456)).toBe(0.00012346) // Very small area with 8 decimal places
      expect(sqmToHaRounded(99.9999)).toBe(0.00999999) // Almost 0.01 hectare with 8 decimal places
    })
  })
})

describe('haToSqm', () => {
  describe('normal conversions', () => {
    test('converts 1 hectare to 10000 sqm', () => {
      expect(haToSqm(1)).toBe(10000)
    })

    test('converts 5 hectares to 50000 sqm', () => {
      expect(haToSqm(5)).toBe(50000)
    })

    test('converts 1.2345 hectares to 12345 sqm', () => {
      expect(haToSqm(1.2345)).toBe(12345)
    })

    test('converts 2.5 hectares to 25000 sqm', () => {
      expect(haToSqm(2.5)).toBe(25000)
    })

    test('converts 0.1 hectares to 1000 sqm', () => {
      expect(haToSqm(0.1)).toBe(1000)
    })

    test('converts decimal hectares with precision', () => {
      expect(haToSqm(1.23456)).toBe(12345.6)
    })
  })

  describe('edge cases', () => {
    test('handles 0 hectares', () => {
      expect(haToSqm(0)).toBe(0)
    })

    test('handles very small areas (less than 1 hectare)', () => {
      expect(haToSqm(0.0001)).toBe(1)
    })

    test('handles very small areas with precision', () => {
      expect(haToSqm(0.00005)).toBe(0.5)
      expect(haToSqm(0.00004)).toBe(0.4)
    })

    test('handles very large areas', () => {
      expect(haToSqm(100)).toBe(1000000)
    })

    test('handles negative numbers', () => {
      expect(haToSqm(-1)).toBe(-10000)
    })

    test('handles fractional hectares with precision', () => {
      expect(haToSqm(1.23454)).toBe(12345.4)
      expect(haToSqm(1.23455)).toBe(12345.5)
    })
  })

  describe('invalid input handling', () => {
    test('returns 0 for null input', () => {
      expect(haToSqm(null)).toBe(0)
    })

    test('returns 0 for undefined input', () => {
      expect(haToSqm(undefined)).toBe(0)
    })

    test('returns 0 for string input', () => {
      expect(haToSqm('1.2345')).toBe(0)
    })

    test('returns 0 for boolean input', () => {
      expect(haToSqm(true)).toBe(0)
    })

    test('returns 0 for object input', () => {
      expect(haToSqm({})).toBe(0)
    })

    test('returns 0 for array input', () => {
      expect(haToSqm([1.2345])).toBe(0)
    })

    test('returns 0 for NaN input', () => {
      expect(haToSqm(NaN)).toBe(0)
    })

    test('returns 0 for empty string', () => {
      expect(haToSqm('')).toBe(0)
    })

    test('returns 0 for non-numeric string', () => {
      expect(haToSqm('abc')).toBe(0)
    })
  })

  describe('precision handling', () => {
    test('maintains decimal precision correctly', () => {
      expect(haToSqm(1.23449)).toBeCloseTo(12344.9)
      expect(haToSqm(1.2345)).toBe(12345)
      expect(haToSqm(1.23451)).toBeCloseTo(12345.1)
      expect(haToSqm(1.23455)).toBeCloseTo(12345.5)
      expect(haToSqm(1.23459)).toBeCloseTo(12345.9)
    })

    test('handles very precise inputs', () => {
      expect(haToSqm(0.000049)).toBeCloseTo(0.49)
      expect(haToSqm(0.00005)).toBeCloseTo(0.5)
      expect(haToSqm(0.000051)).toBeCloseTo(0.51)
    })

    test('handles precision at different scales', () => {
      expect(haToSqm(10.99999)).toBeCloseTo(109999.9)
      expect(haToSqm(10.99994)).toBeCloseTo(109999.4)
      expect(haToSqm(10.99995)).toBeCloseTo(109999.5)
    })
  })

  describe('real world scenarios', () => {
    test('converts typical field sizes', () => {
      expect(haToSqm(2.5)).toBe(25000)
      expect(haToSqm(5.0)).toBe(50000)
      expect(haToSqm(10.0)).toBe(100000)
    })

    test('converts small garden areas', () => {
      expect(haToSqm(0.01)).toBe(100)
      expect(haToSqm(0.05)).toBe(500)
    })

    test('converts large farm areas', () => {
      expect(haToSqm(500)).toBe(5000000)
      expect(haToSqm(1000)).toBe(10000000)
    })

    test('converts complex area measurements with precision', () => {
      expect(haToSqm(12.3456789)).toBeCloseTo(123456.789)
      expect(haToSqm(98.7654321)).toBeCloseTo(987654.321)
    })

    test('converts areas maintaining full precision', () => {
      expect(haToSqm(1.00005)).toBeCloseTo(10000.5)
      expect(haToSqm(0.99995)).toBeCloseTo(9999.5)
      expect(haToSqm(0.99994)).toBeCloseTo(9999.4)
    })

    test('handles floating point precision issues', () => {
      expect(haToSqm(0.1 + 0.2)).toBe(3000.0000000000005)
      expect(haToSqm(0.1 + 0.2)).not.toBe(0.3)
    })
  })
})
