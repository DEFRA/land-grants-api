import {
  SUPPLEMENT_HAS_BASE_ACTION,
  SUPPLEMENT_WITHIN_BASE_ACTION_AREA,
  supplementRuleResults
} from './supplement-validation.service.js'

// Real 2026 rows: CLIG3_26 is the base of GRH7_26 and GRH8_26, CLIG3_26 and
// AGF1_26 are bases of SPM3_26, and GRH7_26 and GRH11_26 can stack (SUPCO)
const baseCodesBySupplement = new Map([
  ['GRH7_26', new Set(['CLIG3_26'])],
  ['GRH8_26', new Set(['CLIG3_26'])],
  ['GRH11_26', new Set(['CLIG3_26'])],
  ['SPM3_26', new Set(['CLIG3_26', 'AGF1_26', 'OFM1_26'])]
])
const stacking = [['GRH7_26', 'GRH11_26']]
const compatibilityCheckFn = (a, b) =>
  stacking.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

const enabled = (code, unit = 'ha') => ({
  code,
  applicationUnitOfMeasurement: unit
})
const actions = [
  'CLIG3_26',
  'AGF1_26',
  'CAGF1',
  'GRH7_26',
  'GRH8_26',
  'GRH11_26',
  'SPM3_26'
].map((code) => enabled(code))

const applied = (code, quantity) => ({ code, quantity })

const resultsFor = (code, appliedOnParcel, enabledActions = actions) => {
  const landAction = {
    sheetId: 'SD6154',
    parcelId: '8973',
    actions: appliedOnParcel
  }

  return supplementRuleResults(
    landAction.actions.find((a) => a.code === code),
    landAction,
    enabledActions,
    baseCodesBySupplement,
    compatibilityCheckFn
  )
}

const resultNamed = (results, name) => results.find((r) => r.name === name)

describe('supplementRuleResults', () => {
  test('gives no results for an action that is not a supplement', () => {
    expect(
      resultsFor('CLIG3_26', [applied('CLIG3_26', 10), applied('GRH7_26', 4)])
    ).toEqual([])
  })

  test('gives no results for a supplement that is not measured by area', () => {
    expect(
      resultsFor(
        'GRH7_26',
        [applied('GRH7_26', 4)],
        [enabled('GRH7_26', 'unit')]
      )
    ).toEqual([])
  })

  describe('the base action', () => {
    test('fails a supplement applied for without its base action', () => {
      const results = resultsFor('GRH7_26', [
        applied('CAGF1', 10),
        applied('GRH7_26', 4)
      ])

      expect(results).toEqual([
        {
          name: SUPPLEMENT_HAS_BASE_ACTION,
          passed: false,
          description: 'Is the supplement applied for with its base action?',
          reason:
            'GRH7_26 must be applied for on the same land parcel as its base action',
          explanations: [
            {
              title: 'Base action',
              lines: [
                'GRH7_26 is a supplement of CLIG3_26, which is not applied for on this land parcel.'
              ]
            }
          ]
        }
      ])
    })

    test('names only the base actions we offer', () => {
      const [result] = resultsFor('SPM3_26', [applied('SPM3_26', 1)])

      expect(result.explanations[0].lines[0]).toBe(
        'SPM3_26 is a supplement of CLIG3_26 or AGF1_26, none of which is applied for on this land parcel.'
      )
    })

    test('fails a supplement whose base action is on another parcel', () => {
      // Another supplement's base on the parcel is not its own
      const results = resultsFor('GRH7_26', [
        applied('AGF1_26', 3),
        applied('SPM3_26', 1),
        applied('GRH7_26', 1)
      ])

      expect(results.map((r) => [r.name, r.passed])).toEqual([
        [SUPPLEMENT_HAS_BASE_ACTION, false]
      ])
    })

    test('passes a supplement applied for with its base action', () => {
      const results = resultsFor('GRH7_26', [
        applied('CLIG3_26', 10),
        applied('GRH7_26', 4)
      ])

      expect(resultNamed(results, SUPPLEMENT_HAS_BASE_ACTION)).toEqual(
        expect.objectContaining({
          passed: true,
          reason: 'GRH7_26 is applied for with its base action CLIG3_26'
        })
      )
    })
  })

  describe('the area of the base action', () => {
    const withinBase = (code, appliedOnParcel) =>
      resultNamed(
        resultsFor(code, appliedOnParcel),
        SUPPLEMENT_WITHIN_BASE_ACTION_AREA
      )

    test('passes a supplement within its base action', () => {
      expect(
        withinBase('GRH7_26', [applied('CLIG3_26', 10), applied('GRH7_26', 10)])
      ).toEqual({
        name: SUPPLEMENT_WITHIN_BASE_ACTION_AREA,
        passed: true,
        description: 'Does the supplement fit within its base action?',
        reason:
          'The applied figure (10 ha) is within the area of its base action left for it (10 ha)',
        explanations: [
          {
            title: 'Base action area',
            lines: [
              'The area of its base action left for GRH7_26, once the other supplements on it have their share, is (10 ha), and the applicant applied for (10 ha).'
            ]
          }
        ]
      })
    })

    test('fails a supplement over its base action', () => {
      expect(
        withinBase('GRH7_26', [applied('CLIG3_26', 9), applied('GRH7_26', 10)])
      ).toEqual(
        expect.objectContaining({
          passed: false,
          reason:
            'The amount of land must be the same as or less than the area of its base action left for it'
        })
      )
    })

    test('fails supplements that cannot stack and together exceed the base', () => {
      const onParcel = [
        applied('CLIG3_26', 10),
        applied('GRH7_26', 6),
        applied('GRH8_26', 5)
      ]

      expect(withinBase('GRH7_26', onParcel).passed).toBe(false)
      expect(withinBase('GRH8_26', onParcel).passed).toBe(false)
    })

    test('passes supplements that cannot stack, side by side within the base', () => {
      const onParcel = [
        applied('CLIG3_26', 10),
        applied('GRH7_26', 6),
        applied('GRH8_26', 4)
      ]

      expect(withinBase('GRH7_26', onParcel).passed).toBe(true)
      expect(withinBase('GRH8_26', onParcel).passed).toBe(true)
    })

    test('passes supplements that can stack on the whole base', () => {
      const onParcel = [
        applied('CLIG3_26', 10),
        applied('GRH7_26', 10),
        applied('GRH11_26', 10)
      ]

      expect(withinBase('GRH7_26', onParcel).passed).toBe(true)
      expect(withinBase('GRH11_26', onParcel).passed).toBe(true)
    })

    test('lets a supplement with several base actions use them all', () => {
      expect(
        withinBase('SPM3_26', [
          applied('CLIG3_26', 5),
          applied('AGF1_26', 3),
          applied('SPM3_26', 8)
        ]).passed
      ).toBe(true)
    })

    test('works in square metres for a supplement and base measured in them', () => {
      const result = resultsFor(
        'GRH7_26',
        [applied('CLIG3_26', 5000), applied('GRH7_26', 6000)],
        [enabled('CLIG3_26', 'sqm'), enabled('GRH7_26', 'sqm')]
      )

      expect(resultNamed(result, SUPPLEMENT_WITHIN_BASE_ACTION_AREA)).toEqual(
        expect.objectContaining({
          passed: false,
          explanations: [
            {
              title: 'Base action area',
              lines: [
                'The area of its base action left for GRH7_26, once the other supplements on it have their share, is (5000 sqm), and the applicant applied for (6000 sqm).'
              ]
            }
          ]
        })
      )
    })
  })
})
