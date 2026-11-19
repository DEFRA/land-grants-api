// Copies the schemas, and the files they import, from src/ into dist/ at the
// same paths so their relative imports still resolve. Runs on `npm pack` /
// `npm publish` via prepack.
//
// Every file in a schema's import graph must be listed in `sources`, and those
// files must import each other by relative path (not the `~/` alias). The
// packaging test installs the packed tarball in a clean project to catch a
// missing entry.
import { cpSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const src = fileURLToPath(new URL('../../../src/', import.meta.url))
const dist = fileURLToPath(new URL('../dist/', import.meta.url))

const PARCEL_SCHEMA = 'features/parcel/schema/2.0.0/parcel.schema.js'
const PARCEL_SUPPLEMENTS_SCHEMA =
  'features/parcel/schema/2.0.0/parcel-supplements.schema.js'
const PAYMENT_CALCULATE_SCHEMA =
  'features/payment/schema/2.0.0/payment-calculate.schema.js'
const APPLICATION_VALIDATION_SCHEMA =
  'features/application/schema/application-validation.schema.js'
const APPLICATION_VALIDATION_SCHEMA_V2 =
  'features/application/schema/2.0.0/application-validation.schema.js'
const COMMON_SCHEMA = 'features/common/schema/index.js'

// The public surface: export name by the file that defines it.
const exportsByFile = {
  [PARCEL_SCHEMA]: ['parcelsSchema', 'parcelsSuccessResponseSchema'],
  [PARCEL_SUPPLEMENTS_SCHEMA]: [
    'parcelSupplementsSchema',
    'parcelSupplementsSuccessResponseSchema'
  ],
  [PAYMENT_CALCULATE_SCHEMA]: [
    'PaymentCalculateSchema',
    'PaymentCalculateResponseSchemaV2'
  ],
  [APPLICATION_VALIDATION_SCHEMA]: ['applicationValidationSchema'],
  [APPLICATION_VALIDATION_SCHEMA_V2]: ['applicationValidationResponseSchemaV2'],
  [COMMON_SCHEMA]: [
    'badRequestResponseSchema',
    'errorResponseSchema',
    'unprocessableEntityResponseSchema',
    'internalServerErrorResponseSchema'
  ]
}

// Modules the schemas import but do not export.
const dependencies = [
  'features/common/constants/status-codes.js',
  'features/common/constants/unit_type.js',
  'features/parcel/constants/unavailable-reasons.js'
]

rmSync(dist, { recursive: true, force: true })

for (const file of [...Object.keys(exportsByFile), ...dependencies]) {
  cpSync(`${src}${file}`, `${dist}${file}`)
}

const index = Object.entries(exportsByFile)
  .map(([file, names]) => `export { ${names.join(', ')} } from './${file}'`)
  .join('\n')

writeFileSync(`${dist}index.js`, `${index}\n`)
