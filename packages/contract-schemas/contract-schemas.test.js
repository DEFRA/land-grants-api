import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as sourceApplicationSchemas from '../../src/features/application/schema/application-validation.schema.js'
import * as sourceApplicationSchemasV2 from '../../src/features/application/schema/2.0.0/application-validation.schema.js'
import * as sourceCaseManagementSchemas from '../../src/features/case-management-adapter/schema/application-validation.schema.js'
import * as sourceCommonSchemas from '../../src/features/common/schema/index.js'
import * as sourceIngestStatusSchemas from '../../src/features/land-data-ingest/schema/status.schema.js'
import * as sourceParcelSchemas from '../../src/features/parcel/schema/2.0.0/parcel.schema.js'
import * as sourceParcelSupplementsSchemas from '../../src/features/parcel/schema/2.0.0/parcel-supplements.schema.js'
import * as sourcePaymentSchemas from '../../src/features/payment/schema/2.0.0/payment-calculate.schema.js'
import * as sourceParcelTilesSchemas from '../../src/features/vector-tiles/schema/parcel-tiles.schema.js'
import * as sourceParcelTilesLocateSchemas from '../../src/features/vector-tiles/schema/parcel-tiles-locate.schema.js'
import * as sourceValidateWmpSchemas from '../../src/features/woodland-management/schema/validate-wmp.schema.js'
import * as sourcePaymentCalculateWmpSchemas from '../../src/features/woodland-management/schema/payment-calculate-wmp.schema.js'
import * as sourcePaymentCalculateTotalWmpSchemas from '../../src/features/woodland-management/schema/payment-calculate-total-wmp.schema.js'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(packageDir, '..', '..')
const PACKAGE_NAME = '@defra/land-grants-contract-schemas'

const sourceModules = [
  sourceApplicationSchemas,
  sourceApplicationSchemasV2,
  sourceCaseManagementSchemas,
  sourceCommonSchemas,
  sourceIngestStatusSchemas,
  sourceParcelSchemas,
  sourceParcelSupplementsSchemas,
  sourcePaymentSchemas,
  sourceParcelTilesSchemas,
  sourceParcelTilesLocateSchemas,
  sourceValidateWmpSchemas,
  sourcePaymentCalculateWmpSchemas,
  sourcePaymentCalculateTotalWmpSchemas
]

// The public surface, listed explicitly so adding or dropping an export is a
// deliberate change to this test.
const PUBLIC_EXPORTS = [
  'parcelsSchema',
  'parcelsSuccessResponseSchema',
  'parcelSupplementsSchema',
  'parcelSupplementsSuccessResponseSchema',
  'PaymentCalculateSchema',
  'PaymentCalculateResponseSchemaV2',
  'applicationValidationSchema',
  'applicationValidationResponseSchemaV2',
  'applicationValidationRunRequestSchema',
  'applicationValidationRunResponseSchema',
  'applicationValidationRunsRequestSchema',
  'applicationValidationRunsBodyRequestSchema',
  'applicationValidationRunsResponseSchema',
  'caseManagementApplicationValidationRunRequestSchema',
  'caseManagementApplicationValidationRunResponseSchema',
  'caseManagementApplicationValidationRerunRequestSchema',
  'caseManagementApplicationValidationReRunResponseSchema',
  'parcelTilesParamsSchema',
  'parcelTilesPayloadSchema',
  'parcelTilesLocatePayloadSchema',
  'parcelTilesLocateSuccessResponseSchema',
  'validateWMPSchemaV2',
  'validateWMPResponseSchemaV2',
  'paymentCalculateWMPSchemaV2',
  'paymentCalculateWMPResponseSchema',
  'paymentCalculateTotalWMPSchema',
  'statusIngestQuery',
  'statusResponseSchema',
  'badRequestResponseSchema',
  'errorResponseSchema',
  'unprocessableEntityResponseSchema',
  'internalServerErrorResponseSchema'
]

// Custom rules carry a function, and the packed copy is a different module
// instance, so functions compare as a marker; their behaviour is tested below.
const describeSchema = (schema) =>
  JSON.parse(
    JSON.stringify(schema.describe(), (_key, value) =>
      typeof value === 'function' ? '[function]' : value
    )
  )

const sourceSchema = (name) => sourceModules.find((m) => name in m)?.[name]

describe('@defra/land-grants-contract-schemas', () => {
  let installDir
  let contract

  // Packs the package and unpacks the tarball into a clean node_modules, as a
  // consumer would receive it, so a file missing from the build's copy list
  // fails here rather than in a consumer. `joi` is linked from the repo to
  // keep the test offline.
  beforeAll(async () => {
    installDir = mkdtempSync(join(tmpdir(), 'contract-schemas-'))
    const packDir = join(installDir, 'pack')
    const target = join(installDir, 'node_modules', PACKAGE_NAME)
    mkdirSync(packDir)
    mkdirSync(target, { recursive: true })

    const [{ filename }] = JSON.parse(
      execFileSync(
        'npm',
        [
          'pack',
          '--json',
          '--ignore-scripts=false',
          '--pack-destination',
          packDir
        ],
        {
          cwd: packageDir,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore']
        }
      )
    )
    execFileSync('tar', [
      '-xzf',
      join(packDir, filename),
      '-C',
      target,
      '--strip-components=1'
    ])
    symlinkSync(
      join(repoRoot, 'node_modules', 'joi'),
      join(installDir, 'node_modules', 'joi')
    )

    contract = await import(
      pathToFileURL(join(target, 'dist', 'index.js')).href
    )
  }, 60_000)

  afterAll(() => {
    rmSync(installDir, { recursive: true, force: true })
  })

  test('exports exactly the public surface', () => {
    expect(Object.keys(contract).sort()).toEqual([...PUBLIC_EXPORTS].sort())
  })

  test('ships no test files or sources outside dist', () => {
    expect(
      existsSync(join(installDir, 'node_modules', PACKAGE_NAME, 'src'))
    ).toBe(false)
  })

  test.each(PUBLIC_EXPORTS)(
    '%s matches the schema the service uses',
    (name) => {
      expect(describeSchema(contract[name])).toEqual(
        describeSchema(sourceSchema(name))
      )
    }
  )

  describe('requests', () => {
    const landAction = {
      sheetId: 'SD6743',
      parcelId: '8083',
      actions: [{ code: 'CMOR1', quantity: 10 }]
    }

    test('parcelsSchema accepts a valid request and rejects a malformed parcel id', () => {
      const request = {
        sbi: '106284736',
        parcelIds: ['SD6743-8083'],
        fields: ['size', 'actions']
      }
      expect(contract.parcelsSchema.validate(request).error).toBeUndefined()
      expect(
        contract.parcelsSchema.validate({ ...request, parcelIds: ['8083'] })
          .error
      ).toBeDefined()
    })

    test('parcelSupplementsSchema requires the base action', () => {
      const request = {
        parcelId: 'SD6743-8083',
        baseAction: { actionCode: 'CMOR1', quantity: 10, unit: 'ha' }
      }
      expect(
        contract.parcelSupplementsSchema.validate(request).error
      ).toBeUndefined()
      expect(
        contract.parcelSupplementsSchema.validate({
          parcelId: request.parcelId
        }).error
      ).toBeDefined()
    })

    test('PaymentCalculateSchema requires parcels with positive quantities', () => {
      expect(
        contract.PaymentCalculateSchema.validate({ parcel: [landAction] }).error
      ).toBeUndefined()
      expect(contract.PaymentCalculateSchema.validate({}).error).toBeDefined()
      expect(
        contract.PaymentCalculateSchema.validate({
          parcel: [{ ...landAction, actions: [{ code: 'CMOR1', quantity: 0 }] }]
        }).error
      ).toBeDefined()
    })

    test('applicationValidationSchema requires at least one land action', () => {
      const request = {
        applicationId: 'APP-1',
        requester: 'grants-ui',
        applicantCrn: '1100014934',
        sbi: '106284736',
        landActions: [landAction]
      }
      expect(
        contract.applicationValidationSchema.validate(request).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationSchema.validate({
          ...request,
          landActions: []
        }).error
      ).toBeDefined()
    })

    test('applicationValidationRunRequestSchema requires an integer id', () => {
      expect(
        contract.applicationValidationRunRequestSchema.validate({ id: 3 }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationRunRequestSchema.validate({ id: 'x' })
          .error
      ).toBeDefined()
    })

    test('applicationValidationRunsRequestSchema and body schema require their fields', () => {
      expect(
        contract.applicationValidationRunsRequestSchema.validate({
          applicationId: 'APP-1'
        }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationRunsRequestSchema.validate({}).error
      ).toBeDefined()
      expect(
        contract.applicationValidationRunsBodyRequestSchema.validate({
          fields: ['details']
        }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationRunsBodyRequestSchema.validate({
          fields: ['other']
        }).error
      ).toBeDefined()
    })

    test('caseManagementApplicationValidationRerunRequestSchema requires the requester and id', () => {
      expect(
        contract.caseManagementApplicationValidationRerunRequestSchema.validate(
          { requesterUsername: 'case.worker', id: 12 }
        ).error
      ).toBeUndefined()
      expect(
        contract.caseManagementApplicationValidationRerunRequestSchema.validate(
          { id: 12 }
        ).error
      ).toBeDefined()
    })

    test('parcelTilesParamsSchema keeps x and y inside the zoom level', () => {
      expect(
        contract.parcelTilesParamsSchema.validate({ z: 2, x: 3, y: 0 }).error
      ).toBeUndefined()
      expect(
        contract.parcelTilesParamsSchema.validate({ z: 2, x: 4, y: 0 }).error
      ).toBeDefined()
      expect(
        contract.parcelTilesParamsSchema.validate({ z: 23, x: 0, y: 0 }).error
      ).toBeDefined()
    })

    test.each(['parcelTilesPayloadSchema', 'parcelTilesLocatePayloadSchema'])(
      '%s requires at least one well-formed parcel id',
      (name) => {
        expect(
          contract[name].validate({ parcelIds: ['SD6743-8083'] }).error
        ).toBeUndefined()
        expect(contract[name].validate({ parcelIds: [] }).error).toBeDefined()
        expect(
          contract[name].validate({ parcelIds: ['not a parcel'] }).error
        ).toBeDefined()
      }
    )

    test('statusIngestQuery allows a filename only alongside an ingest id', () => {
      expect(contract.statusIngestQuery.validate({}).error).toBeUndefined()
      expect(
        contract.statusIngestQuery.validate({ ingestId: 4, filename: 'a.csv' })
          .error
      ).toBeUndefined()
      expect(
        contract.statusIngestQuery.validate({ filename: 'a.csv' }).error
      ).toBeDefined()
    })

    test('validateWMPSchemaV2 requires parcels and the old woodland area', () => {
      const request = { parcelIds: ['SD6743-8083'], oldWoodlandAreaHa: 1.5 }
      expect(
        contract.validateWMPSchemaV2.validate(request).error
      ).toBeUndefined()
      expect(
        contract.validateWMPSchemaV2.validate({ parcelIds: ['SD6743-8083'] })
          .error
      ).toBeDefined()
    })

    test('paymentCalculateWMPSchemaV2 requires both woodland areas and a parcel', () => {
      const request = {
        parcelIds: ['SD6743-8083'],
        oldWoodlandAreaHa: 1,
        newWoodlandAreaHa: 2
      }
      expect(
        contract.paymentCalculateWMPSchemaV2.validate(request).error
      ).toBeUndefined()
      expect(
        contract.paymentCalculateWMPSchemaV2.validate({
          ...request,
          parcelIds: []
        }).error
      ).toBeDefined()
    })

    test('paymentCalculateTotalWMPSchema requires the total area, application and sbi', () => {
      const request = {
        totalAreaHa: 12.5,
        applicationId: 'APP-1',
        sbi: '106284736'
      }
      expect(
        contract.paymentCalculateTotalWMPSchema.validate(request).error
      ).toBeUndefined()
      expect(
        contract.paymentCalculateTotalWMPSchema.validate({
          ...request,
          totalAreaHa: -1
        }).error
      ).toBeDefined()
    })
  })

  describe('responses', () => {
    test('parcelsSuccessResponseSchema accepts a success body and rejects other messages', () => {
      const body = {
        message: 'success',
        parcels: [{ parcelId: '8083', sheetId: 'SD6743' }]
      }
      expect(
        contract.parcelsSuccessResponseSchema.validate(body).error
      ).toBeUndefined()
      expect(
        contract.parcelsSuccessResponseSchema.validate({
          ...body,
          message: 'failure'
        }).error
      ).toBeDefined()
    })

    test('parcelSupplementsSuccessResponseSchema requires the base action code', () => {
      const body = {
        message: 'success',
        parcelId: '8083',
        sheetId: 'SD6743',
        baseActionCode: 'CMOR1',
        supplements: []
      }
      expect(
        contract.parcelSupplementsSuccessResponseSchema.validate(body).error
      ).toBeUndefined()
      expect(
        contract.parcelSupplementsSuccessResponseSchema.validate({
          message: 'success'
        }).error
      ).toBeDefined()
    })

    test('PaymentCalculateResponseSchemaV2 requires the agreement totals', () => {
      const body = {
        message: 'success',
        payment: {
          agreementStartDate: '2026-01-01',
          agreementEndDate: '2029-01-01',
          frequency: 'Quarterly',
          agreementTotalPence: 30000,
          annualTotalPence: 10000,
          payments: [{ totalPaymentPence: 2500, paymentDate: '2026-04-01' }]
        }
      }
      expect(
        contract.PaymentCalculateResponseSchemaV2.validate(body).error
      ).toBeUndefined()
      expect(
        contract.PaymentCalculateResponseSchemaV2.validate({
          message: 'success',
          payment: { ...body.payment, frequency: 'Weekly' }
        }).error
      ).toBeDefined()
    })

    test('applicationValidationResponseSchemaV2 requires the validity flag', () => {
      expect(
        contract.applicationValidationResponseSchemaV2.validate({
          message: 'success',
          id: 1,
          valid: true,
          actions: []
        }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationResponseSchemaV2.validate({
          message: 'success',
          id: 1
        }).error
      ).toBeDefined()
    })

    test('caseManagementApplicationValidationRunRequestSchema requires an integer id', () => {
      expect(
        contract.caseManagementApplicationValidationRunRequestSchema.validate({
          id: 12
        }).error
      ).toBeUndefined()
      expect(
        contract.caseManagementApplicationValidationRunRequestSchema.validate({
          id: 'abc'
        }).error
      ).toBeDefined()
    })

    test('caseManagementApplicationValidationRunResponseSchema accepts nested details components', () => {
      const body = {
        message: 'success',
        response: [
          { component: 'heading', text: 'Result', level: 2 },
          {
            component: 'details',
            summaryItems: [
              { component: 'status', text: 'Passed', colour: 'green' }
            ],
            items: [{ component: 'paragraph', text: 'All rules passed' }]
          }
        ]
      }
      expect(
        contract.caseManagementApplicationValidationRunResponseSchema.validate(
          body
        ).error
      ).toBeUndefined()
      expect(
        contract.caseManagementApplicationValidationRunResponseSchema.validate({
          message: 'success',
          response: [{ component: 'heading', text: 'Result', level: 9 }]
        }).error
      ).toBeDefined()
    })

    test('applicationValidationRunResponseSchema requires the run to be a complete record', () => {
      const run = {
        id: 1,
        application_id: 'APP-1',
        sbi: '106284736',
        crn: '1100014934',
        data: {},
        created_at: '2026-11-17T10:00:00.000Z'
      }
      expect(
        contract.applicationValidationRunResponseSchema.validate({
          message: 'success',
          applicationValidationRun: run
        }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationRunResponseSchema.validate({
          message: 'success',
          applicationValidationRun: { id: 1 }
        }).error
      ).toBeDefined()
    })

    test('applicationValidationRunsResponseSchema accepts summary and detailed runs', () => {
      expect(
        contract.applicationValidationRunsResponseSchema.validate({
          message: 'success',
          applicationValidationRuns: [
            { id: 1, created_at: '2026-11-17T10:00:00.000Z' }
          ]
        }).error
      ).toBeUndefined()
      expect(
        contract.applicationValidationRunsResponseSchema.validate({
          applicationValidationRuns: []
        }).error
      ).toBeDefined()
    })

    test('caseManagementApplicationValidationReRunResponseSchema requires the validity and run id', () => {
      const body = {
        message: 'success',
        valid: true,
        id: 5,
        date: '2026-11-17T10:00:00.000Z'
      }
      expect(
        contract.caseManagementApplicationValidationReRunResponseSchema.validate(
          body
        ).error
      ).toBeUndefined()
      expect(
        contract.caseManagementApplicationValidationReRunResponseSchema.validate(
          { message: 'success' }
        ).error
      ).toBeDefined()
    })

    test('parcelTilesLocateSuccessResponseSchema requires bounds for the box and each parcel', () => {
      const bounds = { minLng: -2, minLat: 51, maxLng: -1, maxLat: 52 }
      const body = {
        message: 'success',
        bbox: bounds,
        parcels: [{ id: 'SD6743-8083', bounds }]
      }
      expect(
        contract.parcelTilesLocateSuccessResponseSchema.validate(body).error
      ).toBeUndefined()
      expect(
        contract.parcelTilesLocateSuccessResponseSchema.validate({
          ...body,
          parcels: [{ id: 'SD6743-8083' }]
        }).error
      ).toBeDefined()
    })

    test('statusResponseSchema accepts an ingest, a file or a list of ingests', () => {
      const file = {
        id: 1,
        ingest_id: 4,
        filename: 'a.csv',
        total_rows: 10,
        status: 'complete'
      }
      const ingest = {
        id: 4,
        entity: 'land_cover',
        status: 'complete',
        start_date: '2026-11-17T10:00:00.000Z',
        completed_date: null,
        files: [file]
      }
      expect(
        contract.statusResponseSchema.validate(ingest).error
      ).toBeUndefined()
      expect(contract.statusResponseSchema.validate(file).error).toBeUndefined()
      expect(
        contract.statusResponseSchema.validate([ingest]).error
      ).toBeUndefined()
      expect(
        contract.statusResponseSchema.validate({ id: 4 }).error
      ).toBeDefined()
    })

    test('validateWMPResponseSchemaV2 requires a complete rule result', () => {
      const body = {
        message: 'success',
        result: {
          hasPassed: true,
          code: 'WMP',
          actionConfigVersion: '1.0.0',
          rules: []
        }
      }
      expect(
        contract.validateWMPResponseSchemaV2.validate(body).error
      ).toBeUndefined()
      expect(
        contract.validateWMPResponseSchemaV2.validate({
          message: 'success',
          result: { hasPassed: true }
        }).error
      ).toBeDefined()
    })

    test('paymentCalculateWMPResponseSchema requires the agreement and payments', () => {
      const body = {
        message: 'success',
        payment: {
          explanations: [],
          agreementStartDate: '2026-01-01',
          agreementEndDate: '2036-01-01',
          frequency: 'Annually',
          agreementTotalPence: 100000,
          parcelItems: {},
          payments: [
            {
              totalPaymentPence: 10000,
              paymentDate: null,
              lineItems: [{ agreementLevelItemId: 1, paymentPence: 10000 }]
            }
          ]
        }
      }
      expect(
        contract.paymentCalculateWMPResponseSchema.validate(body).error
      ).toBeUndefined()
      expect(
        contract.paymentCalculateWMPResponseSchema.validate({
          message: 'success',
          payment: { ...body.payment, payments: undefined }
        }).error
      ).toBeDefined()
    })

    test.each([
      ['errorResponseSchema', 404],
      ['badRequestResponseSchema', 400],
      ['unprocessableEntityResponseSchema', 422],
      ['internalServerErrorResponseSchema', 500]
    ])('%s accepts only its own status code', (name, statusCode) => {
      const body = { statusCode, error: 'Error', message: 'Something failed' }
      expect(contract[name].validate(body).error).toBeUndefined()
      expect(
        contract[name].validate({ ...body, statusCode: 418 }).error
      ).toBeDefined()
    })
  })
})
