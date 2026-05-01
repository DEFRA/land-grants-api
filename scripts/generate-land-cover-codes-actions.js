import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { parse } from 'csv-parse/sync'

// Run with:
// node scripts/generate-land-cover-codes-actions.js src/land-data/land_cover_codes/land-codes.csv src/land-data/land_cover_codes/code-mapping.csv
// Generates a deduplicated, sorted land_cover_codes_actions.csv from land-codes and code-mapping inputs.
// Mapping details:
// - Join key:
//   - land-codes.csv column "LAND USE CODE"
//   - code-mapping.csv column 8 ("Land Use Code")
// - Output columns:
//   - "action code"            <= land-codes.csv "OPTION CODE"
//   - "land cover code"        <= code-mapping.csv column 6
//   - "land cover class code"  <= code-mapping.csv column 4
// - Behavior:
//   - Rows with missing mappings are skipped and printed to stdout.
//   - Output is deduplicated on (action code, land cover code, land cover class code)
//     and sorted by action code, then land cover code, then land cover class code.

const OUTPUT_FILE_NAME = 'land_cover_codes_actions.csv'

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})

/**
 * Entry point for generating the land cover codes actions file.
 * @returns {Promise<void>} Resolves when the output file has been written.
 */
async function main() {
  const [landCodesPath, codeMappingPath] = process.argv.slice(2)

  if (!landCodesPath || !codeMappingPath) {
    throw new Error(
      'Usage: node scripts/generate-land-cover-codes-actions.js <land-codes.csv> <code-mapping.csv>'
    )
  }

  const [landCodesCsv, codeMappingCsv] = await Promise.all([
    fs.readFile(landCodesPath, 'utf8'),
    fs.readFile(codeMappingPath, 'utf8')
  ])

  const landUseCodeToCoverCodes = buildLandUseCodeMapping(codeMappingCsv)
  const { outputRows, missingLandUseCodes } = buildOutputRows(
    landCodesCsv,
    landUseCodeToCoverCodes
  )
  const outputCsv = toCsv(outputRows)
  const outputDirectory = path.dirname(path.resolve(landCodesPath))
  const outputPath = path.join(outputDirectory, OUTPUT_FILE_NAME)

  await fs.writeFile(outputPath, outputCsv, 'utf8')

  console.log(`Generated ${outputRows.length - 1} rows in ${outputPath}`)

  if (missingLandUseCodes.length > 0) {
    console.warn(
      `Missing ${missingLandUseCodes.length} land use code(s): ${missingLandUseCodes.join(', ')}`
    )
  }
}

/**
 * Creates a lookup map from land use code to land cover codes.
 * @param {string} codeMappingCsv - Contents of the code-mapping.csv file.
 * @returns {Map<string, { landCoverCode: string, landCoverClassCode: string }>} Mapping keyed by Land Use Code.
 */
function buildLandUseCodeMapping(codeMappingCsv) {
  const mappingRows = parse(codeMappingCsv, {
    relax_column_count: true,
    skip_empty_lines: true
  })

  const landUseCodeToCoverCodes = new Map()

  // code-mapping.csv uses duplicated "Code" headers, so fixed indexes are
  // used from the latest 8-column dataset:
  // column 4 => land_cover_class_code, column 6 => land_cover_code,
  // column 8 => action/land use code.
  const LAND_COVER_CODE_INDEX = 5
  const LAND_COVER_CLASS_CODE_INDEX = 3
  const LAND_USE_CODE_INDEX = 7

  for (let index = 1; index < mappingRows.length; index++) {
    const row = mappingRows[index]
    const landUseCode = String(row[LAND_USE_CODE_INDEX] ?? '').trim()
    const landCoverCode = String(row[LAND_COVER_CODE_INDEX] ?? '').trim()
    const landCoverClassCode = String(
      row[LAND_COVER_CLASS_CODE_INDEX] ?? ''
    ).trim()

    if (!landUseCode || !landCoverCode || !landCoverClassCode) {
      continue
    }

    if (!landUseCodeToCoverCodes.has(landUseCode)) {
      landUseCodeToCoverCodes.set(landUseCode, {
        landCoverCode,
        landCoverClassCode
      })
    }
  }

  return landUseCodeToCoverCodes
}

/**
 * Builds output CSV rows for the land_cover_codes_actions file.
 * @param {string} landCodesCsv - Contents of the land-codes.csv file.
 * @param {Map<string, { landCoverCode: string, landCoverClassCode: string }>} landUseCodeToCoverCodes - Mapping keyed by Land Use Code.
 * @returns {{ outputRows: string[][], missingLandUseCodes: string[] }} Output rows plus missing land use codes.
 */
function buildOutputRows(landCodesCsv, landUseCodeToCoverCodes) {
  /** @type {Record<string, string>[]} */
  const landCodeRows = parse(landCodesCsv, {
    columns: true,
    skip_empty_lines: true
  })

  /** @type {Set<string>} */
  const uniqueOutputRows = new Set()
  const missingLandUseCodes = new Set()

  for (const row of landCodeRows) {
    const actionCode = String(row['OPTION CODE'] ?? '').trim()
    const landUseCode = String(row['LAND USE CODE'] ?? '').trim()
    const mappedCodes = landUseCodeToCoverCodes.get(landUseCode)

    if (!actionCode || !landUseCode || !mappedCodes) {
      if (landUseCode && !mappedCodes) {
        missingLandUseCodes.add(landUseCode)
      }
      continue
    }

    uniqueOutputRows.add(
      [
        actionCode,
        mappedCodes.landCoverCode,
        mappedCodes.landCoverClassCode
      ].join('|')
    )
  }

  const sortedOutputRows = [...uniqueOutputRows]
    .map((row) => row.split('|'))
    .sort((left, right) => {
      const actionCompare = left[0].localeCompare(right[0], 'en', {
        numeric: true
      })
      if (actionCompare !== 0) {
        return actionCompare
      }

      const landCoverCompare = left[1].localeCompare(right[1], 'en', {
        numeric: true
      })
      if (landCoverCompare !== 0) {
        return landCoverCompare
      }

      return left[2].localeCompare(right[2], 'en', {
        numeric: true
      })
    })

  /** @type {string[][]} */
  const outputRows = [
    ['action code', 'land cover code', 'land cover class code'],
    ...sortedOutputRows
  ]

  const sortedMissingLandUseCodes = [...missingLandUseCodes].sort(
    (left, right) => left.localeCompare(right)
  )

  if (sortedMissingLandUseCodes.length > 0) {
    console.warn(
      `Skipped ${sortedMissingLandUseCodes.length} land use code(s) missing from code mapping`
    )
  }

  return {
    outputRows,
    missingLandUseCodes: sortedMissingLandUseCodes
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
 * Escapes a single CSV value.
 * @param {string} value - Value to escape.
 * @returns {string} Escaped CSV value.
 */
function escapeCsvValue(value) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}
