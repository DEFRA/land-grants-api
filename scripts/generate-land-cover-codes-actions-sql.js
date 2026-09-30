import fs from 'node:fs/promises'
import process from 'node:process'
import { gzipSync } from 'node:zlib'
import { parse } from 'csv-parse/sync'

// Run with:
// node scripts/generate-land-cover-codes-actions-sql.js src/land-data/land_cover_codes/land_cover_codes_actions.csv src/land-data/migration/land-cover-codes-actions-v3.sql.gz
// Generates a gzipped Liquibase SQL file that replaces the contents of land_cover_codes_actions
// with the rows of the land_cover_codes_actions.csv produced by generate-land-cover-codes-actions.js.

const COLUMNS = ['action code', 'land cover code', 'land cover class code']

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})

/**
 * Entry point for generating the land cover codes actions migration.
 * @returns {Promise<void>} Resolves when the output file has been written.
 */
async function main() {
  const [inputPath, outputPath] = process.argv.slice(2)

  if (!inputPath || !outputPath?.endsWith('.sql.gz')) {
    throw new Error(
      'Usage: node scripts/generate-land-cover-codes-actions-sql.js <land_cover_codes_actions.csv> <output.sql.gz>'
    )
  }

  /** @type {Record<string, string>[]} */
  const rows = parse(await fs.readFile(inputPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  })

  if (rows.length === 0) {
    throw new Error(`No rows found in ${inputPath}`)
  }

  assertColumns(rows, COLUMNS, inputPath)

  const values = rows.map(
    (row) =>
      `  (${[
        row['action code'],
        row['land cover code'],
        row['land cover class code']
      ]
        .map(toSqlString)
        .join(', ')})`
  )

  const sql = [
    'TRUNCATE TABLE land_cover_codes_actions RESTART IDENTITY;',
    '',
    'INSERT INTO land_cover_codes_actions (',
    '  action_code,',
    '  land_cover_code,',
    '  land_cover_class_code',
    ') VALUES',
    `${values.join(',\n')};`,
    ''
  ].join('\n')

  await fs.writeFile(outputPath, gzipSync(sql))

  console.log(`Generated ${rows.length} rows in ${outputPath}`)
}

/**
 * Throws if the CSV does not contain the expected columns. Without this a
 * mis-named header writes the string 'undefined' into the migration silently.
 * @param {Record<string, string>[]} rows - Parsed CSV rows.
 * @param {string[]} columns - Expected column names.
 * @param {string} inputPath - Path used in the error message.
 */
function assertColumns(rows, columns, inputPath) {
  const actualColumns = Object.keys(rows[0] ?? {})
  const missingColumns = columns.filter(
    (column) => !actualColumns.includes(column)
  )

  if (missingColumns.length > 0) {
    throw new Error(
      `${inputPath} is missing column(s): ${missingColumns.join(', ')}`
    )
  }
}

/**
 * Formats a value as a SQL string literal.
 * @param {string} value - Value to format.
 * @returns {string} Quoted and escaped SQL literal.
 */
function toSqlString(value) {
  return `'${String(value).trim().replaceAll("'", "''")}'`
}
