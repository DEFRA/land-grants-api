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

  test('extracts description when present', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.description).toBe('Woodland management plan')
  })

  test('defaults description to null when absent', () => {
    const result = transformActionConfig({ ...pa3Json, description: undefined })
    expect(result.description).toBeNull()
  })

  test('extracts sssiEligible and hfEligible when present', () => {
    const result = transformActionConfig({
      ...pa3Json,
      sssiEligible: false,
      hfEligible: false
    })
    expect(result.sssiEligible).toBe(false)
    expect(result.hfEligible).toBe(false)
  })

  test('defaults sssiEligible to true when absent', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.sssiEligible).toBe(true)
  })

  test('defaults hfEligible to true when absent', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.hfEligible).toBe(true)
  })

  test('extracts groupId when present', () => {
    const result = transformActionConfig({ ...pa3Json, groupId: 2 })
    expect(result.groupId).toBe(2)
  })

  test('defaults groupId to null when absent', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.groupId).toBeNull()
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

  test('throws when semanticVersion is missing', () => {
    expect(() =>
      transformActionConfig({ ...pa3Json, semanticVersion: undefined })
    ).toThrow('Invalid action config')
  })

  test('throws when semanticVersion is null', () => {
    expect(() =>
      transformActionConfig({ ...pa3Json, semanticVersion: null })
    ).toThrow('Invalid action config')
  })

  test('throws when semanticVersion contains non-numeric parts', () => {
    expect(() =>
      transformActionConfig({ ...pa3Json, semanticVersion: '1.x.0' })
    ).toThrow('Invalid semanticVersion "1.x.0"')
  })

  test('normalises partial version to canonical major.minor.patch form', () => {
    const result = transformActionConfig({ ...pa3Json, semanticVersion: '2' })
    expect(result.major).toBe(2)
    expect(result.minor).toBe(0)
    expect(result.patch).toBe(0)
    expect(result.semanticVersion).toBe('2.0.0')
  })

  test('normalises semanticVersion to canonical form from parsed parts', () => {
    const result = transformActionConfig({
      ...pa3Json,
      semanticVersion: '3.1.4'
    })
    expect(result.semanticVersion).toBe('3.1.4')
  })

  describe('schema validation', () => {
    test('throws when code is missing', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, code: undefined })
      ).toThrow('"code" is required')
    })

    test('collects multiple errors when both required fields are absent', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          code: undefined,
          semanticVersion: undefined
        })
      ).toThrow('Invalid action config')
    })

    test('throws when displayOrder is not a number', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, displayOrder: 'first' })
      ).toThrow('Invalid action config')
    })

    test('does not throw for unknown top-level fields', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          description: 'extra',
          enabled: true
        })
      ).not.toThrow()
    })

    test('does not throw when payment is null', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, payment: null })
      ).not.toThrow()
    })
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
