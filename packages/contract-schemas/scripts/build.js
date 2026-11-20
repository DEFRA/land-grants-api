// Copies the schemas, and the files they import, from src/ into dist/ at the
// same paths so their relative imports still resolve. Runs on `npm pack` /
// `npm publish` via prepack.
//
// Every file in a schema's import graph must be listed in `exportsByFile` or
// `dependencies`, and those files must import each other by relative path (not
// the `~/` alias). The packaging test installs the packed tarball in a clean
// project to catch a missing entry.
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
const CASE_MANAGEMENT_SCHEMA =
  'features/case-management-adapter/schema/application-validation.schema.js'
const PARCEL_TILES_SCHEMA =
  'features/vector-tiles/schema/parcel-tiles.schema.js'
const PARCEL_TILES_LOCATE_SCHEMA =
  'features/vector-tiles/schema/parcel-tiles-locate.schema.js'
const VALIDATE_WMP_SCHEMA =
  'features/woodland-management/schema/validate-wmp.schema.js'
const PAYMENT_CALCULATE_WMP_SCHEMA =
  'features/woodland-management/schema/payment-calculate-wmp.schema.js'
const PAYMENT_CALCULATE_TOTAL_WMP_SCHEMA =
  'features/woodland-management/schema/payment-calculate-total-wmp.schema.js'
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
  [APPLICATION_VALIDATION_SCHEMA]: [
    'applicationValidationSchema',
    'applicationValidationRunRequestSchema',
    'applicationValidationRunResponseSchema',
    'applicationValidationRunsRequestSchema',
    'applicationValidationRunsBodyRequestSchema',
    'applicationValidationRunsResponseSchema'
  ],
  [APPLICATION_VALIDATION_SCHEMA_V2]: ['applicationValidationResponseSchemaV2'],
  [CASE_MANAGEMENT_SCHEMA]: [
    'caseManagementApplicationValidationRunRequestSchema',
    'caseManagementApplicationValidationRunResponseSchema',
    'caseManagementApplicationValidationRerunRequestSchema',
    'caseManagementApplicationValidationReRunResponseSchema'
  ],
  [PARCEL_TILES_SCHEMA]: [
    'parcelTilesParamsSchema',
    'parcelTilesPayloadSchema'
  ],
  [PARCEL_TILES_LOCATE_SCHEMA]: [
    'parcelTilesLocatePayloadSchema',
    'parcelTilesLocateSuccessResponseSchema'
  ],
  [VALIDATE_WMP_SCHEMA]: ['validateWMPSchemaV2', 'validateWMPResponseSchemaV2'],
  [PAYMENT_CALCULATE_WMP_SCHEMA]: [
    'paymentCalculateWMPSchemaV2',
    'paymentCalculateWMPResponseSchema'
  ],
  [PAYMENT_CALCULATE_TOTAL_WMP_SCHEMA]: ['paymentCalculateTotalWMPSchema'],
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
