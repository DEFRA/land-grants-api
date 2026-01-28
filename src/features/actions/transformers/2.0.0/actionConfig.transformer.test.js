import { actionConfigTransformer } from './actionConfig.transformer.js'

describe('actionConfigTransformer', () => {
  test('should transform action config correctly', () => {
    const action = {
      code: 'CMOR1',
      name: 'Create or restore wetland',
      enabled: true,
      version: 1,
      duration_years: 3,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001', 'LC002'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      payment: { rate: 100 },
      rules: { minArea: 5 },
      major_version: 1,
      minor_version: 2,
      patch_version: 3
    }

    const result = actionConfigTransformer(action)

    expect(result).toEqual({
      code: 'CMOR1',
      name: 'Create or restore wetland',
      enabled: true,
      version: 1,
      applicationUnitOfMeasurement: 'hectares',
      durationYears: 3,
      landCoverClassCodes: ['LC001', 'LC002'],
      startDate: '2024-01-01',
      lastUpdated: new Date('2024-01-01T00:00:00Z'),
      payment: { rate: 100 },
      rules: { minArea: 5 },
      majorVersion: 1,
      minorVersion: 2,
      patchVersion: 3,
      semanticVersion: '1.2.3'
    })
  })

  test('should convert duration_years to number', () => {
    const action = {
      code: 'UPL1',
      duration_years: '5',
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      major_version: 1,
      minor_version: 0,
      patch_version: 0
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(5)
    expect(typeof result.durationYears).toBe('number')
  })

  test('should handle null duration_years', () => {
    const action = {
      code: 'UPL1',
      duration_years: null,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      major_version: 1,
      minor_version: 0,
      patch_version: 0
    }

    const result = actionConfigTransformer(action)

    expect(result.durationYears).toBe(0)
  })

  test('should handle null land_cover_class_codes', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: null,
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      major_version: 1,
      minor_version: 0,
      patch_version: 0
    }

    const result = actionConfigTransformer(action)

    expect(result.landCoverClassCodes).toBeNull()
  })

  test('should create semanticVersion from version components', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      major_version: 2,
      minor_version: 5,
      patch_version: 10
    }

    const result = actionConfigTransformer(action)

    expect(result.semanticVersion).toBe('2.5.10')
  })

  test('should not include original snake_case fields in result', () => {
    const action = {
      code: 'UPL1',
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      major_version: 1,
      minor_version: 0,
      patch_version: 0
    }

    const result = actionConfigTransformer(action)

    expect(result.duration_years).toBeUndefined()
    expect(result.application_unit_of_measurement).toBeUndefined()
    expect(result.land_cover_class_codes).toBeUndefined()
    expect(result.start_date).toBeUndefined()
    expect(result.last_updated).toBeUndefined()
    expect(result.major_version).toBeUndefined()
    expect(result.minor_version).toBeUndefined()
    expect(result.patch_version).toBeUndefined()
  })

  test('should preserve other fields in action object', () => {
    const action = {
      code: 'UPL1',
      name: 'Action Name',
      enabled: true,
      version: 2,
      duration_years: 5,
      application_unit_of_measurement: 'hectares',
      land_cover_class_codes: ['LC001'],
      start_date: '2024-01-01',
      last_updated: new Date('2024-01-01T00:00:00Z'),
      payment: { rate: 200, type: 'annual' },
      rules: { minArea: 10, maxArea: 100 },
      customField: 'custom value',
      major_version: 1,
      minor_version: 0,
      patch_version: 0
    }

    const result = actionConfigTransformer(action)

    expect(result.code).toBe('UPL1')
    expect(result.name).toBe('Action Name')
    expect(result.enabled).toBe(true)
    expect(result.version).toBe(2)
    expect(result.payment).toEqual({ rate: 200, type: 'annual' })
    expect(result.rules).toEqual({ minArea: 10, maxArea: 100 })
    expect(result.customField).toBe('custom value')
  })
})
