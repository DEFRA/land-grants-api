import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'

vi.mock(
  '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js',
  () => ({
    getCompatibilityMatrix: vi.fn()
  })
)

// The matrix the land data ingest loads, converted from the RPA's spreadsheet
const SEEDED_MATRIX_PATH = new URL(
  '../../land-data/compatibility_matrix/compatibility-matrix.csv',
  import.meta.url
)

const LINEAR_ACTIONS = [
  'BND1',
  'BND1_26',
  'BND2',
  'BND2_26',
  'CHRW2',
  'CHRW2_26',
  'WBD2',
  'WBD2_26'
]

const readSeededMatrix = () => {
  const csv = readFileSync(SEEDED_MATRIX_PATH, 'utf8')
  const rows = parse(csv, { columns: true })

  return rows.map((row) => ({
    optionCode: row['OPTION CODE'],
    optionCodeCompat: row['OPTION CODE COMPAT']
  }))
}

const everyPairOf = (actionCodes) =>
  actionCodes.flatMap((first, position) =>
    actionCodes.slice(position + 1).map((second) => [first, second])
  )

const hasRowsFor = (matrix, actionCode) =>
  matrix.some(
    (row) =>
      row.optionCode === actionCode || row.optionCodeCompat === actionCode
  )

const listsAsCompatible = (matrix, first, second) =>
  matrix.some(
    (row) => row.optionCode === first && row.optionCodeCompat === second
  )

const seededMatrix = readSeededMatrix()

describe('linear action compatibility in the seeded matrix', () => {
  let areCompatible

  beforeAll(async () => {
    vi.mocked(getCompatibilityMatrix).mockResolvedValue(seededMatrix)

    areCompatible = await createCompatibilityMatrix({}, {})
  })

  describe('every linear action is in the seeded matrix', () => {
    it.each(LINEAR_ACTIONS)(
      '%s has rows in the seeded matrix',
      (actionCode) => {
        const seeded = hasRowsFor(seededMatrix, actionCode)

        expect(seeded).toBe(true)
      }
    )
  })

  describe('BND1 is incompatible with the other linear actions', () => {
    it.each([
      ['BND1', 'BND2'],
      ['BND1', 'BND2_26'],
      ['BND1', 'CHRW2'],
      ['BND1', 'CHRW2_26'],
      ['BND1', 'WBD2'],
      ['BND1', 'WBD2_26'],
      ['BND1_26', 'BND2'],
      ['BND1_26', 'BND2_26'],
      ['BND1_26', 'CHRW2'],
      ['BND1_26', 'CHRW2_26'],
      ['BND1_26', 'WBD2'],
      ['BND1_26', 'WBD2_26']
    ])('%s cannot share a stretch with %s', (first, second) => {
      const compatible = areCompatible(first, second)

      expect(compatible).toBe(false)
    })
  })

  describe('BND2, CHRW2 and WBD2 are compatible with each other', () => {
    it.each([
      ['BND2', 'CHRW2'],
      ['BND2', 'CHRW2_26'],
      ['BND2_26', 'CHRW2'],
      ['BND2_26', 'CHRW2_26'],
      ['BND2', 'WBD2'],
      ['BND2', 'WBD2_26'],
      ['BND2_26', 'WBD2'],
      ['BND2_26', 'WBD2_26'],
      ['CHRW2', 'WBD2'],
      ['CHRW2', 'WBD2_26'],
      ['CHRW2_26', 'WBD2'],
      ['CHRW2_26', 'WBD2_26']
    ])('%s can share a stretch with %s', (first, second) => {
      const compatible = areCompatible(first, second)

      expect(compatible).toBe(true)
    })
  })

  describe('compatibility is symmetric', () => {
    it.each(everyPairOf(LINEAR_ACTIONS))(
      '%s and %s are listed the same in either order',
      (first, second) => {
        const forwards = listsAsCompatible(seededMatrix, first, second)
        const backwards = listsAsCompatible(seededMatrix, second, first)

        expect(backwards).toBe(forwards)
      }
    )
  })
})
