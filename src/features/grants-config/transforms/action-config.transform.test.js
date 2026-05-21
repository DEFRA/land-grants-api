import { transformActionConfig } from './action-config.transform.js'

describe('transformActionConfig', () => {
  const pa3Json = {
    code: 'PA3',
    description: 'Woodland management plan',
    enabled: true,
    display: false,
    payment: null,
    rules: [{ name: 'some-rule', description: 'desc' }],
    applicationUnitOfMeasurement: 'ha',
    durationYears: 10,
    startDate: '2025-01-01',
    semanticVersion: '1.0.0',
    displayOrder: 0,
    paymentMethod: {
      name: 'wmp-calculation',
      config: { tiers: [] }
    }
  }

  test('extracts code and semanticVersion', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.code).toBe('PA3')
    expect(result.semanticVersion).toBe('1.0.0')
  })

  test('parses semantic version into major/minor/patch', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.major).toBe(1)
    expect(result.minor).toBe(0)
    expect(result.patch).toBe(0)
  })

  test('parses non-zero semantic version parts', () => {
    const result = transformActionConfig({
      ...pa3Json,
      semanticVersion: '2.3.4'
    })
    expect(result.major).toBe(2)
    expect(result.minor).toBe(3)
    expect(result.patch).toBe(4)
  })

  test('extracts displayOrder', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.displayOrder).toBe(0)
  })

  test('defaults displayOrder to 0 when missing', () => {
    const result = transformActionConfig({
      ...pa3Json,
      displayOrder: undefined
    })
    expect(result.displayOrder).toBe(0)
  })

  test('maps camelCase fields to snake_case config JSONB keys', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config).toEqual({
      start_date: '2025-01-01',
      application_unit_of_measurement: 'ha',
      duration_years: 10,
      payment: null,
      payment_method: { name: 'wmp-calculation', config: { tiers: [] } },
      land_cover_class_codes: [],
      rules: [{ name: 'some-rule', description: 'desc' }]
    })
  })

  test('defaults landCoverClassCodes to empty array when absent', () => {
    const result = transformActionConfig({
      ...pa3Json,
      landCoverClassCodes: undefined
    })
    expect(result.config.land_cover_class_codes).toEqual([])
  })

  test('preserves provided landCoverClassCodes', () => {
    const result = transformActionConfig({
      ...pa3Json,
      landCoverClassCodes: ['GRASS']
    })
    expect(result.config.land_cover_class_codes).toEqual(['GRASS'])
  })

  test('leaves optional config fields undefined when absent from input', () => {
    const result = transformActionConfig({
      code: 'PA3',
      semanticVersion: '1.0.0',
      payment: undefined,
      rules: undefined
    })
    expect(result.config.start_date).toBeUndefined()
    expect(result.config.application_unit_of_measurement).toBeUndefined()
    expect(result.config.duration_years).toBeUndefined()
    expect(result.config.payment_method).toBeUndefined()
    expect(result.config.rules).toEqual([])
  })

  test('defaults major/minor/patch to 1/0/0 when semanticVersion is missing', () => {
    const result = transformActionConfig({
      ...pa3Json,
      semanticVersion: undefined
    })
    expect(result.major).toBe(1)
    expect(result.minor).toBe(0)
    expect(result.patch).toBe(0)
  })

  test('defaults minor/patch to 0 when semanticVersion has fewer than 3 parts', () => {
    const result = transformActionConfig({ ...pa3Json, semanticVersion: '2' })
    expect(result.major).toBe(2)
    expect(result.minor).toBe(0)
    expect(result.patch).toBe(0)
  })

  test('config does not include top-level action metadata fields', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config).not.toHaveProperty('code')
    expect(result.config).not.toHaveProperty('semanticVersion')
    expect(result.config).not.toHaveProperty('displayOrder')
    expect(result.config).not.toHaveProperty('enabled')
    expect(result.config).not.toHaveProperty('description')
  })
})
