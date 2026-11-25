// Copies the schemas, and the files they import, from src/ into dist/ at the
// same paths so their relative imports still resolve. Runs on `npm pack` /
// `npm publish` via prepack.
//
// Every file in a schema's import graph must be listed in `schemasByFile` or
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
const INGEST_STATUS_SCHEMA = 'features/land-data-ingest/schema/status.schema.js'
const COMMON_SCHEMA = 'features/common/schema/index.js'

// Schema names by the file that defines them.
const schemasByFile = {
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
  [INGEST_STATUS_SCHEMA]: ['statusIngestQuery', 'statusResponseSchema'],
  [COMMON_SCHEMA]: [
    'badRequestResponseSchema',
    'errorResponseSchema',
    'unprocessableEntityResponseSchema',
    'internalServerErrorResponseSchema'
  ]
}

const errorResponses = {
  404: 'errorResponseSchema',
  500: 'internalServerErrorResponseSchema'
}

// The public surface: each endpoint's request parts and responses by status,
// keyed by path and method so the service's internal schema names stay
// internal.
const paths = {
  '/api/v2/parcels': {
    post: {
      payload: 'parcelsSchema',
      responses: { 200: 'parcelsSuccessResponseSchema', ...errorResponses }
    }
  },
  '/api/v2/parcels/supplements': {
    post: {
      payload: 'parcelSupplementsSchema',
      responses: {
        200: 'parcelSupplementsSuccessResponseSchema',
        400: 'badRequestResponseSchema',
        ...errorResponses
      }
    }
  },
  '/api/v2/payments/calculate': {
    post: {
      payload: 'PaymentCalculateSchema',
      responses: { 200: 'PaymentCalculateResponseSchemaV2', ...errorResponses }
    }
  },
  '/api/v2/application/validate': {
    post: {
      payload: 'applicationValidationSchema',
      responses: {
        200: 'applicationValidationResponseSchemaV2',
        422: 'unprocessableEntityResponseSchema',
        ...errorResponses
      }
    }
  },
  '/application/validation-run/{id}': {
    post: {
      params: 'applicationValidationRunRequestSchema',
      responses: {
        200: 'applicationValidationRunResponseSchema',
        ...errorResponses
      }
    }
  },
  '/application/{applicationId}/validation-run': {
    post: {
      params: 'applicationValidationRunsRequestSchema',
      payload: 'applicationValidationRunsBodyRequestSchema',
      responses: {
        200: 'applicationValidationRunsResponseSchema',
        ...errorResponses
      }
    }
  },
  '/case-management-adapter/application/validation-run/{id}': {
    get: {
      params: 'caseManagementApplicationValidationRunRequestSchema',
      responses: {
        200: 'caseManagementApplicationValidationRunResponseSchema',
        ...errorResponses
      }
    }
  },
  '/case-management-adapter/application/validation-run/rerun': {
    post: {
      payload: 'caseManagementApplicationValidationRerunRequestSchema',
      responses: {
        200: 'caseManagementApplicationValidationReRunResponseSchema',
        ...errorResponses
      }
    }
  },
  '/api/v1/parcel-tiles/{z}/{x}/{y}': {
    post: {
      params: 'parcelTilesParamsSchema',
      payload: 'parcelTilesPayloadSchema',
      responses: {}
    }
  },
  '/api/v1/parcel-tiles/locate': {
    post: {
      payload: 'parcelTilesLocatePayloadSchema',
      responses: {
        200: 'parcelTilesLocateSuccessResponseSchema',
        ...errorResponses
      }
    }
  },
  '/api/v1/wmp/validate': {
    post: {
      payload: 'validateWMPSchemaV2',
      responses: { 200: 'validateWMPResponseSchemaV2', ...errorResponses }
    }
  },
  '/api/v1/wmp/payments/calculate': {
    post: {
      payload: 'paymentCalculateWMPSchemaV2',
      responses: { 200: 'paymentCalculateWMPResponseSchema', ...errorResponses }
    }
  },
  '/api/v1/wmp/payments/calculate-by-total-area': {
    post: {
      payload: 'paymentCalculateTotalWMPSchema',
      responses: { 200: 'paymentCalculateWMPResponseSchema', ...errorResponses }
    }
  },
  '/ingest/status': {
    get: {
      query: 'statusIngestQuery',
      responses: { 200: 'statusResponseSchema', ...errorResponses }
    }
  }
}

// Modules the schemas import but do not export.
const dependencies = [
  'features/common/constants/status-codes.js',
  'features/common/constants/unit_type.js',
  'features/parcel/constants/unavailable-reasons.js'
]

rmSync(dist, { recursive: true, force: true })

for (const file of [...Object.keys(schemasByFile), ...dependencies]) {
  cpSync(`${src}${file}`, `${dist}${file}`)
}

const imports = Object.entries(schemasByFile)
  .map(([file, names]) => `import { ${names.join(', ')} } from './${file}'`)
  .join('\n')

// Writes the map as source, with each schema name as a reference to its import.
const sourceOf = (value) => {
  if (typeof value === 'string') {
    return value
  }
  const entries = Object.entries(value).map(
    ([key, inner]) => `${JSON.stringify(key)}: ${sourceOf(inner)}`
  )
  return `{ ${entries.join(', ')} }`
}

writeFileSync(
  `${dist}index.js`,
  `${imports}\n\nexport const paths = ${sourceOf(paths)}\n`
)
