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
import { applicationValidationSchema as sourceApplicationValidationSchema } from '../../src/features/application/schema/application-validation.schema.js'
import * as sourceCommonSchemas from '../../src/features/common/schema/index.js'
import * as sourceParcelSchemas from '../../src/features/parcel/schema/2.0.0/parcel.schema.js'
import * as sourceParcelSupplementsSchemas from '../../src/features/parcel/schema/2.0.0/parcel-supplements.schema.js'
import * as sourcePaymentSchemas from '../../src/features/payment/schema/2.0.0/payment-calculate.schema.js'
import * as sourceApplicationSchemasV2 from '../../src/features/application/schema/2.0.0/application-validation.schema.js'

const packageDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(packageDir, '..', '..')
const PACKAGE_NAME = '@defra/land-grants-contract-schemas'

const sourceByExport = {
  parcelsSchema: sourceParcelSchemas.parcelsSchema,
  parcelsSuccessResponseSchema:
    sourceParcelSchemas.parcelsSuccessResponseSchema,
  parcelSupplementsSchema:
    sourceParcelSupplementsSchemas.parcelSupplementsSchema,
  parcelSupplementsSuccessResponseSchema:
    sourceParcelSupplementsSchemas.parcelSupplementsSuccessResponseSchema,
  PaymentCalculateSchema: sourcePaymentSchemas.PaymentCalculateSchema,
  PaymentCalculateResponseSchemaV2:
    sourcePaymentSchemas.PaymentCalculateResponseSchemaV2,
  applicationValidationSchema: sourceApplicationValidationSchema,
  applicationValidationResponseSchemaV2:
    sourceApplicationSchemasV2.applicationValidationResponseSchemaV2,
  badRequestResponseSchema: sourceCommonSchemas.badRequestResponseSchema,
  errorResponseSchema: sourceCommonSchemas.errorResponseSchema,
  unprocessableEntityResponseSchema:
    sourceCommonSchemas.unprocessableEntityResponseSchema,
  internalServerErrorResponseSchema:
    sourceCommonSchemas.internalServerErrorResponseSchema
}

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
    expect(Object.keys(contract).sort()).toEqual(
      Object.keys(sourceByExport).sort()
    )
  })

  test('ships no test files or sources outside dist', () => {
    expect(
      existsSync(join(installDir, 'node_modules', PACKAGE_NAME, 'src'))
    ).toBe(false)
  })

  test.each(Object.keys(sourceByExport))(
    '%s matches the schema the service uses',
    (name) => {
      expect(contract[name].describe()).toEqual(sourceByExport[name].describe())
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
