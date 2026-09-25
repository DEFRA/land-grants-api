import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { parse } from 'csv-parse/sync'

// Run with:
// node scripts/convert-matrix-spreadsheets.js <option-compatibility-matrix.xlsx|.csv> <land-use-application-matrix.xls|.csv> [year]
// Converts the RPA exports of the Option Compatibility Matrix and the Land Use Application Matrix
// into the CSV files used by the service:
// - src/land-data/compatibility_matrix/compatibility-matrix.csv (ingested via the land data ingest)
// - src/land-data/land_cover_codes/land-codes.csv (input to generate-land-cover-codes-actions.js)
// Behaviour:
// - Inputs can be .csv files, saved from the spreadsheets as "CSV UTF-8" with any spreadsheet tool,
//   so LibreOffice is not needed.
// - .xls/.xlsx inputs are converted to CSV using LibreOffice (soffice must be on the PATH), which also opens
//   write-protected .xls files.
// - Compatibility matrix rows are filtered to the given year (default 2026) and exact duplicates removed.
// - Option codes are kept as-is, including scheme suffixes such as "_26".
// - Land use rows are deduplicated on (option code, land use code).

const DEFAULT_YEAR = '2026'
const COMPATIBILITY_MATRIX_OUTPUT = path.resolve(
  'src/land-data/compatibility_matrix/compatibility-matrix.csv'
)
const LAND_CODES_OUTPUT = path.resolve(
  'src/land-data/land_cover_codes/land-codes.csv'
)
const COMPATIBILITY_MATRIX_COLUMNS = [
  'OPTION CODE',
  'OPTION CODE COMPAT',
  'TYPE',
  'DESCRIPTION',
  'YEAR'
]
const LAND_CODES_COLUMNS = ['OPTION CODE', 'LAND USE CODE', 'DESCRIPTION']

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})

/**
 * Entry point for converting the matrix spreadsheets.
 * @returns {Promise<void>} Resolves when both output files have been written.
 */
async function main() {
  const [compatibilityMatrixPath, landUsePath, year = DEFAULT_YEAR] =
    process.argv.slice(2)

  if (!compatibilityMatrixPath || !landUsePath) {
    throw new Error(
      'Usage: node scripts/convert-matrix-spreadsheets.js <option-compatibility-matrix.xlsx|.csv> <land-use-application-matrix.xls|.csv> [year]'
    )
  }

  const workDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'matrix-spreadsheets-')
  )

  try {
    const [compatibilityMatrixRows, landUseRows] = await Promise.all([
      readSpreadsheetRows(compatibilityMatrixPath, workDirectory, 'cm'),
      readSpreadsheetRows(landUsePath, workDirectory, 'lu')
    ])

    const compatibilityMatrix = buildCompatibilityMatrixRows(
      compatibilityMatrixRows,
      year
    )
    const landCodes = buildLandCodesRows(landUseRows)

    await fs.writeFile(
      COMPATIBILITY_MATRIX_OUTPUT,
      toCsv([COMPATIBILITY_MATRIX_COLUMNS, ...compatibilityMatrix]),
      'utf8'
    )
    await fs.writeFile(
      LAND_CODES_OUTPUT,
      toCsv([LAND_CODES_COLUMNS, ...landCodes]),
      'utf8'
    )

    console.log(
      `Wrote ${compatibilityMatrix.length} ${year} rows to ${COMPATIBILITY_MATRIX_OUTPUT}`
    )
    console.log(`Wrote ${landCodes.length} rows to ${LAND_CODES_OUTPUT}`)
  } finally {
    await fs.rm(workDirectory, { recursive: true, force: true })
  }
}

/**
 * Reads the rows of a .csv file, or of the first sheet of a .xls/.xlsx file.
 * @param {string} spreadsheetPath - Path to the .csv/.xls/.xlsx file.
 * @param {string} workDirectory - Temporary directory for the conversion.
 * @param {string} name - Name used for the intermediate copy.
 * @returns {Promise<Record<string, string>[]>} Parsed rows keyed by trimmed header.
 */
async function readSpreadsheetRows(spreadsheetPath, workDirectory, name) {
  const csvPath =
    path.extname(spreadsheetPath).toLowerCase() === '.csv'
      ? spreadsheetPath
      : await convertToCsv(spreadsheetPath, workDirectory, name)

  const csv = await fs.readFile(csvPath, 'utf8')

  return parse(csv, {
    bom: true,
    columns: (header) => header.map((column) => String(column).trim()),
    skip_empty_lines: true,
    relax_column_count: true
  })
}

/**
 * Converts the first sheet of a spreadsheet to CSV with LibreOffice.
 * @param {string} spreadsheetPath - Path to the .xls/.xlsx file.
 * @param {string} workDirectory - Temporary directory for the conversion.
 * @param {string} name - Name used for the intermediate copy.
 * @returns {Promise<string>} Path to the converted CSV file.
 */
async function convertToCsv(spreadsheetPath, workDirectory, name) {
  // Copy first so that spaces/brackets in the source filename don't matter
  const extension = path.extname(spreadsheetPath)
  const sourcePath = path.join(workDirectory, `${name}${extension}`)
  await fs.copyFile(spreadsheetPath, sourcePath)

  // 44 = comma separator, 34 = double quote text delimiter, 76 = UTF-8
  try {
    execFileSync(
      'soffice',
      [
        `-env:UserInstallation=file://${path.join(workDirectory, `profile-${name}`)}`,
        '--headless',
        '--convert-to',
        'csv:Text - txt - csv (StarCalc):44,34,76',
        '--outdir',
        workDirectory,
        sourcePath
      ],
      { stdio: 'ignore' }
    )
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'LibreOffice (soffice) was not found on the PATH. Install LibreOffice, or save each spreadsheet ' +
          'as "CSV UTF-8" and pass the .csv files instead.'
      )
    }
    throw error
  }

  return path.join(workDirectory, `${name}.csv`)
}

/**
 * Builds the compatibility matrix rows for a single year.
 * @param {Record<string, string>[]} rows - Parsed spreadsheet rows.
 * @param {string} year - Year to keep.
 * @returns {string[][]} Deduplicated rows in COMPATIBILITY_MATRIX_COLUMNS order.
 */
function buildCompatibilityMatrixRows(rows, year) {
  assertColumns(rows, COMPATIBILITY_MATRIX_COLUMNS, 'compatibility matrix')

  const uniqueRows = new Map()

  for (const row of rows) {
    const values = COMPATIBILITY_MATRIX_COLUMNS.map((column) =>
      String(row[column] ?? '').trim()
    )
    const [optionCode, optionCodeCompat, , , rowYear] = values

    if (rowYear !== year || !optionCode || !optionCodeCompat) {
      continue
    }

    uniqueRows.set(values.join('|'), values)
  }

  if (uniqueRows.size === 0) {
    throw new Error(`No compatibility matrix rows found for year ${year}`)
  }

  return [...uniqueRows.values()]
}

/**
 * Builds the land-codes rows (option code to land use code).
 * @param {Record<string, string>[]} rows - Parsed spreadsheet rows.
 * @returns {string[][]} Deduplicated rows in LAND_CODES_COLUMNS order.
 */
function buildLandCodesRows(rows) {
  assertColumns(rows, LAND_CODES_COLUMNS, 'land use matrix')

  const uniqueRows = new Map()

  for (const row of rows) {
    const values = LAND_CODES_COLUMNS.map((column) =>
      String(row[column] ?? '').trim()
    )
    const [optionCode, landUseCode] = values

    if (!optionCode || !landUseCode) {
      continue
    }

    const key = `${optionCode}|${landUseCode}`
    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, values)
    }
  }

  return [...uniqueRows.values()]
}

/**
 * Throws if the spreadsheet does not contain the expected columns.
 * @param {Record<string, string>[]} rows - Parsed spreadsheet rows.
 * @param {string[]} columns - Expected column names.
 * @param {string} label - Name used in the error message.
 */
function assertColumns(rows, columns, label) {
  const actualColumns = Object.keys(rows[0] ?? {})
  const missingColumns = columns.filter(
    (column) => !actualColumns.includes(column)
  )

  if (missingColumns.length > 0) {
    throw new Error(
      `The ${label} is missing column(s): ${missingColumns.join(', ')}`
    )
  }
}

/**
 * Converts rows into CSV text.
 * @param {string[][]} rows - Rows to format as CSV.
 * @returns {string} CSV output with newline terminator.
 */
function toCsv(rows) {
  return `${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')}\n`
}

/**
 * Escapes a CSV value when needed.
 * @param {string} value - Value to escape.
 * @returns {string} Escaped value.
 */
function escapeCsvValue(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}
