import { transformActionConfig } from './action-config.transform.js'
import { AVAILABILITY_TYPES } from '~/src/features/common/constants/action_availability.js'
import { UNIT_TYPES } from '~/src/features/common/constants/unit_type.js'

describe('transformActionConfig', () => {
  const pa3Json = {
    applicationUnitOfMeasurement: 'ha',
    code: 'PA3',
    description: 'Woodland management plan',
    display: false,
    displayOrder: 0,
    displayUnit: 'blueberry',
    displayUnitPlural: 'blueberries',
    durationYears: 10,
    enabled: true,
    groupId: null,
    payment: null,
    paymentMethod: {
      name: 'wmp-calculation',
      config: { tiers: [] }
    },
    rules: [{ name: 'applied-for-total-available-area', description: 'desc' }],
    semanticVersion: '1.0.0',
    startDate: '2025-01-01'
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

  test('extracts description', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.description).toBe('Woodland management plan')
  })

  test('extracts groupId when present', () => {
    const result = transformActionConfig({ ...pa3Json, groupId: 2 })
    expect(result.groupId).toBe(2)
  })

  test('keeps a null groupId', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.groupId).toBeNull()
  })

  test('extracts availability into config when present', () => {
    const result = transformActionConfig({
      ...pa3Json,
      availability: { type: 'total' }
    })
    expect(result.config.availability).toEqual({ type: 'total' })
  })

  test('defaults config.availability to null when absent', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config.availability).toBeNull()
  })

  test('extracts guidanceUrl into config.guidance_url when present', () => {
    const result = transformActionConfig({
      ...pa3Json,
      guidanceUrl: 'https://example.com'
    })
    expect(result.config.guidance_url).toBe('https://example.com')
  })

  test('defaults config.guidance_url to null when absent', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config.guidance_url).toBeNull()
  })

  test('extracts config.displayUnit when present', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config.display_unit).toBe('blueberry')
  })

  test('defaults config.displayUnit to null when absent', () => {
    const result = transformActionConfig({ ...pa3Json, displayUnit: undefined })
    expect(result.config.display_unit).toBeNull()
  })

  test('extracts config.displayUnitPlural when present', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config.display_unit_plural).toBe('blueberries')
  })

  test('defaults config.displayUnitPlural to null when absent', () => {
    const result = transformActionConfig({
      ...pa3Json,
      displayUnitPlural: undefined
    })
    expect(result.config.display_unit_plural).toBeNull()
  })

  test('sets config.enabled', () => {
    const result = transformActionConfig({
      ...pa3Json,
      enabled: false
    })
    expect(result.config.enabled).toBe(false)
  })

  test('sets config.display', () => {
    const result = transformActionConfig({
      ...pa3Json,
      display: false
    })
    expect(result.config.display).toBe(false)
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
      rules: [
        { name: 'applied-for-total-available-area', description: 'desc' }
      ],
      guidance_url: null,
      availability: null,
      display_unit: 'blueberry',
      display_unit_plural: 'blueberries',
      enabled: true,
      display: false
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

    test.each([
      'description',
      'display',
      'displayOrder',
      'durationYears',
      'enabled',
      'groupId',
      'payment',
      'paymentMethod',
      'rules',
      'startDate'
    ])('throws when %s is missing', (field) => {
      expect(() =>
        transformActionConfig({ ...pa3Json, [field]: undefined })
      ).toThrow(`"${field}" is required`)
    })

    test('collects multiple errors when both required fields are absent', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          code: undefined,
          semanticVersion: undefined
        })
      ).toThrow('"code" is required; "semanticVersion" is required')
    })

    test('throws when displayOrder is not a number', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, displayOrder: 'first' })
      ).toThrow('Invalid action config')
    })

    test('throws for an unknown top-level field', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, notAField: true })
      ).toThrow('"notAField" is not allowed')
    })

    test('throws for a rule the rules engine does not have', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          rules: [{ name: 'made-up-rule', description: 'desc' }]
        })
      ).toThrow('"made-up-rule-1.0.0" is an unknown rule')
    })

    test('does not throw when payment is null', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, payment: null })
      ).not.toThrow()
    })

    test('throws when availability is null', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, availability: null })
      ).toThrow('"availability" must be of type object')
    })

    test.each(AVAILABILITY_TYPES)(
      'does not throw for a valid availability.type %s',
      (type) => {
        expect(() =>
          transformActionConfig({
            ...pa3Json,
            availability: { type }
          })
        ).not.toThrow()
      }
    )

    test('throws when availability.type is not a recognised value', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          availability: { type: 'not-a-real-type' }
        })
      ).toThrow('Invalid action config')
    })

    test('throws for availability.type "limited" (temporarily removed)', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          availability: { type: 'limited' }
        })
      ).toThrow('Invalid action config')
    })

    test('throws when guidanceUrl is not a valid URI', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          guidanceUrl: 'not-a-url'
        })
      ).toThrow('Invalid action config')
    })

    test('throws when startDate is not a date', () => {
      expect(() =>
        transformActionConfig({ ...pa3Json, startDate: 'first of January' })
      ).toThrow('"startDate" must be in iso format')
    })

    test('throws when applicationUnitOfMeasurement is missing', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          applicationUnitOfMeasurement: undefined
        })
      ).toThrow('Invalid action config')
    })

    test('throws when applicationUnitOfMeasurement is not a recognised unit', () => {
      expect(() =>
        transformActionConfig({
          ...pa3Json,
          applicationUnitOfMeasurement: 'hectares'
        })
      ).toThrow('Invalid action config')
    })

    test.each(UNIT_TYPES)(
      'does not throw for a valid applicationUnitOfMeasurement %s',
      (unit) => {
        expect(() =>
          transformActionConfig({
            ...pa3Json,
            applicationUnitOfMeasurement: unit
          })
        ).not.toThrow()
      }
    )
  })

  test('config does not include top-level action metadata fields', () => {
    const result = transformActionConfig(pa3Json)
    expect(result.config).not.toHaveProperty('code')
    expect(result.config).not.toHaveProperty('semanticVersion')
    expect(result.config).not.toHaveProperty('displayOrder')
    expect(result.config).not.toHaveProperty('description')
  })
})
