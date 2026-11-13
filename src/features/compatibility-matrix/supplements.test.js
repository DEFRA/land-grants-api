import { getActionCodesWithSupplements } from './supplements.js'

const row = (optionCode, optionCodeCompat, type) => ({
  id: 1,
  optionCode,
  optionCodeCompat,
  type,
  year: 2026
})

// CLIG3 is a base for GRH7, GRH8 and GRH10
const clig3Supplements = [
  row('CLIG3', 'GRH7', 'SUPBAS'),
  row('CLIG3', 'GRH8', 'SUPBAS'),
  row('CLIG3', 'GRH10', 'SUPBAS')
]

describe('getActionCodesWithSupplements', () => {
  test('includes an action that is a SUPBAS base for supported supplements', () => {
    expect(
      getActionCodesWithSupplements(clig3Supplements, [
        'CLIG3',
        'GRH7',
        'GRH8',
        'GRH10'
      ])
    ).toEqual(new Set(['CLIG3']))
  })

  test('excludes an action whose supplements are not supported', () => {
    expect(getActionCodesWithSupplements(clig3Supplements, ['CLIG3'])).toEqual(
      new Set()
    )
  })

  test('includes an action when at least one of its supplements is supported', () => {
    expect(
      getActionCodesWithSupplements(clig3Supplements, ['CLIG3', 'GRH10'])
    ).toEqual(new Set(['CLIG3']))
  })

  test('excludes a supported base whose supplement is enabled but not displayed (e.g. UPL1 with SPM4)', () => {
    // SPM4 is not in the supported codes, as only displayed actions are passed in
    const matrix = [row('UPL1', 'SPM4', 'SUPBAS')]

    expect(getActionCodesWithSupplements(matrix, ['UPL1'])).toEqual(new Set())
  })

  test('ignores relationships that are not SUPBAS', () => {
    const matrix = [
      row('CLIG3', 'AGF1', 'BASECO'),
      row('GRH7', 'GRH11', 'SUPCO'),
      row('AB1', 'FG6', 'SUPBPA')
    ]

    expect(
      getActionCodesWithSupplements(matrix, ['AGF1', 'GRH11', 'FG6'])
    ).toEqual(new Set())
  })

  test('only treats the base side of a SUPBAS row as having supplements', () => {
    const result = getActionCodesWithSupplements(clig3Supplements, [
      'CLIG3',
      'GRH7',
      'GRH8',
      'GRH10'
    ])

    expect(result.has('GRH7')).toBe(false)
    expect(result.has('GRH8')).toBe(false)
    expect(result.has('GRH10')).toBe(false)
  })

  test('returns an empty set for an empty matrix', () => {
    expect(getActionCodesWithSupplements([], ['GRH7'])).toEqual(new Set())
  })
})
