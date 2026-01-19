import { actionConfigTransformer } from './actionConfig.transformer.js'

describe('actionConfigTransformer', () => {
  test('should transform action config with all fields correctly', () => {
    const action = {
      code: 'CMOR1',
      name: 'Create or restore wetland',
      enabled: true,
      version: '1.0.0',
      application_unit_of_measurement: 'hectares',
      duration_years: 3,
      payment: { rate: 100 },
      land_cover_class_codes: ['LC001', 'LC002'],
      rules: { minArea: 5 },
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result).toEqual({
      code: 'CMOR1',
      name: 'Create or restore wetland',
      enabled: true,
      version: '1.0.0',
      applicationUnitOfMeasurement: 'hectares',
      durationYears: 3,
      payment: { rate: 100 },
      landCoverClassCodes: ['LC001', 'LC002'],
      rules: { minArea: 5 },
      startDate: '2024-01-01',
      lastUpdated: new Date('2024-01-01T00:00:00Z')
    })
  })

  test('should convert duration_years to Number', () => {
    const action = {
      code: 'UPL1',
      duration_years: '5',
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(5)
    expect(typeof result.durationYears).toBe('number')
  })

  test('should handle numeric string duration_years', () => {
    const action = {
      code: 'SPM4',
      duration_years: '10',
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(10)
  })

  test('should handle zero duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: 0,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(0)
  })

  test('should handle negative duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: -5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(-5)
  })

  test('should handle floating point duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: 3.5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(3.5)
  })

  test('should handle null duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: null,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(0)
  })

  test('should handle undefined duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: undefined,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBeNaN()
  })

  test('should handle empty land_cover_class_codes array', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: [],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.landCoverClassCodes).toEqual([])
  })

  test('should handle null land_cover_class_codes', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: null,
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.landCoverClassCodes).toBeNull()
  })

  test('should handle multiple land cover class codes', () => {
    const action = {
      code: 'CMOR1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001', 'LC002', 'LC003', 'LC004'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.landCoverClassCodes).toEqual([
      'LC001',
      'LC002',
      'LC003',
      'LC004'
    ])
  })

  test('should preserve other fields in action object', () => {
    const action = {
      code: 'UPL1',
      name: 'Action Name',
      enabled: true,
      version: '2.0.0',
      payment: { rate: 200, type: 'annual' },
      rules: { minArea: 10, maxArea: 100 },
      customField: 'custom value',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.code).toBe('UPL1')
    expect(result.name).toBe('Action Name')
    expect(result.enabled).toBe(true)
    expect(result.version).toBe('2.0.0')
    expect(result.payment).toEqual({ rate: 200, type: 'annual' })
    expect(result.rules).toEqual({ minArea: 10, maxArea: 100 })
    expect(result.customField).toBe('custom value')
  })

  test('should not include original snake_case fields in result', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.duration_years).toBeUndefined()
    expect(result.application_unit_of_measurement).toBeUndefined()
    expect(result.land_cover_class_codes).toBeUndefined()
    expect(result.start_date).toBeUndefined()
    expect(result.last_updated).toBeUndefined()
  })

  test('should handle action with minimal fields', () => {
    const action = {
      code: 'MIN1',
      duration_years: 1,
      application_unit_of_measurement: 'units',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result).toEqual({
      code: 'MIN1',
      durationYears: 1,
      applicationUnitOfMeasurement: 'units',
      landCoverClassCodes: ['LC001'],
      startDate: '2024-01-01',
      lastUpdated: new Date('2024-01-01T00:00:00Z')
    })
  })

  test('should handle Date objects for start_date', () => {
    const startDate = new Date('2024-06-15T12:30:00Z')
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: startDate,
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.startDate).toBe(startDate)
  })

  test('should handle Date objects for last_updated', () => {
    const lastUpdated = new Date('2024-06-15T12:30:00Z')
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: lastUpdated
    }

    const result = actionConfigTransformer(action)

    expect(result.lastUpdated).toBe(lastUpdated)
  })

  test('should handle null start_date', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: null,
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.startDate).toBeNull()
  })

  test('should handle null last_updated', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: null
    }

    const result = actionConfigTransformer(action)

    expect(result.lastUpdated).toBeNull()
  })

  test('should handle different unit of measurement values', () => {
    const testCases = [
      'hectares',
      'meters',
      'kilometers',
      'items',
      'units',
      'square meters'
    ]

    testCases.forEach((unit) => {
      const action = {
        code: 'TEST',
        duration_years: 5,
        application_unit_of_measurement: unit,
        land_cover_class_codes: ['LC001'],
        start_date: '2024-01-01',
        last_updated: new Date('2024-01-01T00:00:00Z')
      }

      const result = actionConfigTransformer(action)

      expect(result.applicationUnitOfMeasurement).toBe(unit)
    })
  })

  test('should handle complex payment objects', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      payment: {
        rate: 150,
        type: 'annual',
        currency: 'GBP',
        tiers: [
          { min: 0, max: 10, rate: 100 },
          { min: 10, max: 50, rate: 150 }
        ]
      }
    }

    const result = actionConfigTransformer(action)

    expect(result.payment).toEqual({
      rate: 150,
      type: 'annual',
      currency: 'GBP',
      tiers: [
        { min: 0, max: 10, rate: 100 },
        { min: 10, max: 50, rate: 150 }
      ]
    })
  })

  test('should handle complex rules objects', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      rules: {
        minArea: 5,
        maxArea: 100,
        eligibility: ['rule1', 'rule2'],
        restrictions: {
          moorland: { maxPercentage: 50 },
          overlap: { allowed: false }
        }
      }
    }

    const result = actionConfigTransformer(action)

    expect(result.rules).toEqual({
      minArea: 5,
      maxArea: 100,
      eligibility: ['rule1', 'rule2'],
      restrictions: {
        moorland: { maxPercentage: 50 },
        overlap: { allowed: false }
      }
    })
  })

  test('should handle action config with boolean values', () => {
    const action = {
      code: 'UPL1',
      enabled: false,
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      isActive: true,
      isDeprecated: false
    }

    const result = actionConfigTransformer(action)

    expect(result.enabled).toBe(false)
    expect(result.isActive).toBe(true)
    expect(result.isDeprecated).toBe(false)
  })

  test('should handle action config with version', () => {
    const action = {
      code: 'UPL1',
      version: '2.0.0',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z')
    }

    const result = actionConfigTransformer(action)

    expect(result.version).toBe('2.0.0')
  })

  test('should not mutate original action object', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      enabled: true
    }

    const originalAction = { ...action }
    actionConfigTransformer(action)

    expect(action).toEqual(originalAction)
  })
})
