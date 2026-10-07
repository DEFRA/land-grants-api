import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const mappingFile = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../land-data/action_sssi_hf_mapping/action_sssi_hf_mapping.csv'
)

// The temp table the ingest loads this into is positional - action_code,
// sssi_eligible, hf_eligible - so the header names carry no meaning.
const readMapping = () =>
  parse(readFileSync(mappingFile, 'utf8'), {
    columns: ['actionCode', 'sssiEligible', 'hfEligible'],
    from_line: 2,
    skip_empty_lines: true,
    trim: true
  })

const legacyCodeFor = (actionCode) => actionCode.replace(/_26$/, '')

describe('Action sssi and historic_features mapping', () => {
  const rows = readMapping()

  const rowFor = (actionCode) =>
    rows.find((row) => row.actionCode === actionCode)

  const eligibilityOf = (row) => ({
    sssiEligible: row.sssiEligible,
    hfEligible: row.hfEligible
  })

  test.each([
    'CLIG3_26',
    'CNUM2_26',
    'CSAM3_26',
    'SCR2_26',
    'UPL1_26',
    'UPL2_26',
    'UPL3_26',
    'UPL8_26',
    'UPL10_26',
    'WBD1_26'
  ])('%s inherits the eligibility of its legacy counterpart', (actionCode) => {
    expect(rowFor(actionCode)).toEqual({
      actionCode,
      ...eligibilityOf(rowFor(legacyCodeFor(actionCode)))
    })
  })

  // Linear actions never reach the available area calculation
  test.each([['BND1_26']])(
    '%s holds no row because it is a linear action',
    (actionCode) => {
      expect(rowFor(actionCode)).toBeUndefined()
    }
  )

  test('every _26 row matches its legacy counterpart', () => {
    const inherited = rows
      .filter((row) => row.actionCode.endsWith('_26'))
      .filter((row) => rowFor(legacyCodeFor(row.actionCode)))
      .map((row) => {
        const legacy = rowFor(legacyCodeFor(row.actionCode))

        return {
          actionCode: row.actionCode,
          sssiEligible: row.sssiEligible,
          hfEligible: row.hfEligible,
          legacySssiEligible: legacy.sssiEligible,
          legacyHfEligible: legacy.hfEligible
        }
      })

    expect(
      inherited.filter(
        (row) =>
          row.sssiEligible !== row.legacySssiEligible ||
          row.hfEligible !== row.legacyHfEligible
      )
    ).toEqual([])
  })

  test('holds one row per action code', () => {
    const codes = rows.map((row) => row.actionCode)

    expect(codes).toHaveLength(new Set(codes).size)
  })

  test('records each eligibility as 0 or 1', () => {
    const values = rows.flatMap((row) => [row.sssiEligible, row.hfEligible])

    expect(values.filter((value) => value !== '0' && value !== '1')).toEqual([])
  })
})
