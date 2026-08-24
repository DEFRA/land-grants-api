import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { calculateWMPPaymentWithRateVersion } from '../service/wmp-rate-version.service.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import createTestServer from '~/src/tests/test-server.js'
import {
  AuditEvent,
  auditEvent
} from '~/src/features/common/helpers/audit-event.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('../service/wmp-rate-version.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    calculateWMPPaymentWithRateVersion: vi.fn()
  }
})
vi.mock('../transformer/wmp-payment-calculate.transformer.js')
vi.mock('~/src/features/common/helpers/audit-event.js')

const mockGetLandData = getLandData
const mockCalculateWMPPaymentWithRateVersion =
  calculateWMPPaymentWithRateVersion
const mockWmpPaymentCalculateTransformer = wmpPaymentCalculateTransformer
const mockAuditEvent = auditEvent

const createMockParcel = () => ({
  id: 1,
  sheet_id: 'SX067',
  parcel_id: '99238',
  area_sqm: 80000,
  area: 8,
  geom: 'POLYGON((0 0,1 0,1 1,0 1,0 0))',
  last_updated: new Date('2024-01-01')
})

const createMockAction = () => ({
  id: 1,
  code: 'PA3',
  description: 'Woodland Management Plan',
  semanticVersion: '1.1.0',
  durationYears: 5,
  rules: [],
  paymentMethod: {
    name: 'wmp-calculation',
    version: '1.0.0',
    config: {
      newWoodlandMaxPercent: 20,
      tiers: [
        {
          lowerLimitHa: 0.5,
          upperLimitHa: 51,
          flatRateGbp: 1500,
          ratePerUnitGbp: 0
        },
        {
          lowerLimitHa: 50,
          upperLimitHa: 100,
          flatRateGbp: 1500,
          ratePerUnitGbp: 30
        },
        {
          lowerLimitHa: 100,
          upperLimitHa: null,
          flatRateGbp: 3000,
          ratePerUnitGbp: 15
        }
      ]
    }
  }
})

const createMockCalculationResult = () => ({
  eligibleArea: 8,
  payment: 1500,
  activePaymentTier: 1,
  quantityInActiveTier: 7.5,
  activeTierRatePence: 0,
  activeTierFlatRatePence: 1500
})

const createMockPaymentResponse = () => ({
  explanations: [],
  agreementStartDate: '2024-01-01',
  agreementEndDate: '2029-01-01',
  frequency: 'Single',
  agreementTotalPence: 1500,
  parcelItems: {},
  agreementLevelItems: {
    1: {
      code: 'PA3',
      description: 'Woodland Management Plan',
      version: '1.1.0',
      parcelIds: ['SX067-99238'],
      activePaymentTier: 1,
      quantityInActiveTier: 7.5,
      activeTierRatePence: 0,
      activeTierFlatRatePence: 1500,
      agreementTotalPence: 1500,
      unit: 'ha',
      quantity: 8
    }
  },
  payments: [
    {
      totalPaymentPence: 1500,
      paymentDate: '2024-01-01',
      lineItems: [{ agreementLevelItemId: 1, paymentPence: 1500 }]
    }
  ]
})

const validPayload = {
  parcelIds: ['SX067-99238'],
  oldWoodlandAreaHa: 5,
  newWoodlandAreaHa: 3,
  startDate: '2024-01-01'
}

describe('Payment calculate WMP controller', () => {
  const server = createTestServer()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })

    await server.register([woodlandManagement])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLandData.mockResolvedValue([createMockParcel()])
    mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
      paymentResult: createMockCalculationResult(),
      action: createMockAction(),
      rateVersion: { value: null, source: 'latest' }
    })
    mockWmpPaymentCalculateTransformer.mockReturnValue(
      createMockPaymentResponse()
    )
  })

  describe('successful calculation', () => {
    test('should return 200 with payment response when all inputs are valid', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, payment }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(payment).toEqual(createMockPaymentResponse())
      expect(mockCalculateWMPPaymentWithRateVersion).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        {
          oldWoodlandAreaSqm: 5 * 10000,
          newWoodlandAreaSqm: 3 * 10000
        },
        { version: undefined, validationRunId: undefined }
      )
      expect(mockWmpPaymentCalculateTransformer).toHaveBeenCalledWith(
        ['SX067-99238'],
        createMockCalculationResult(),
        expect.objectContaining({ code: 'PA3' }),
        expect.any(Date)
      )
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        expect.objectContaining({
          parcelIds: ['SX067-99238'],
          request: {
            oldWoodlandAreaHa: 5,
            newWoodlandAreaHa: 3,
            startDate: new Date('2024-01-01'),
            rateVersion: null,
            rateVersionSource: 'latest'
          },
          response: createMockPaymentResponse()
        }),
        'success',
        expect.objectContaining({ method: 'post' })
      )
    })

    test('should return 200 when startDate is not provided, defaulting to next month', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          oldWoodlandAreaHa: 5,
          newWoodlandAreaHa: 3
        }
      })

      expect(statusCode).toBe(200)
    })

    test('should pin the rate to an explicit version and record it in the audit event', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        paymentResult: createMockCalculationResult(),
        action: createMockAction('1.0.0'),
        rateVersion: { value: '1.0.0', source: 'explicit' }
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, version: '1.0.0' }
      })

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(mockCalculateWMPPaymentWithRateVersion).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { version: '1.0.0', validationRunId: undefined }
      )
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        expect.objectContaining({
          request: expect.objectContaining({
            rateVersion: '1.0.0',
            rateVersionSource: 'explicit'
          })
        }),
        'success',
        expect.objectContaining({ method: 'post' })
      )
    })

    test('should resolve the rate version from a validation run id and record it in the audit event', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        paymentResult: createMockCalculationResult(),
        action: createMockAction(),
        rateVersion: { value: '1.1.0', source: 'run' }
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, validationRunId: 42 }
      })

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(mockCalculateWMPPaymentWithRateVersion).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        { version: undefined, validationRunId: 42 }
      )
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        expect.objectContaining({
          request: expect.objectContaining({
            rateVersion: '1.1.0',
            rateVersionSource: 'run'
          })
        }),
        'success',
        expect.objectContaining({ method: 'post' })
      )
    })
  })

  describe('validation errors', () => {
    test('should return 400 when land parcels are not found', async () => {
      mockGetLandData.mockResolvedValue([])

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('Land parcels not found: SX067-99238')
      expect(mockAuditEvent).not.toHaveBeenCalled()
    })

    test('should return 400 when no WMP action config exists at all', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        error: 'Action not found'
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('Action not found')
    })

    test('should return 400 when the requested rate version does not exist', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        error: "Action config for PA3 at version '9.9.9' not found"
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, version: '9.9.9' }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe("Action config for PA3 at version '9.9.9' not found")
    })

    test('should return 400 when the validation run does not contain a pinned rate version', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        error:
          "Application validation run '999' does not contain a rate version for action code PA3"
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, validationRunId: 999 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe(
        "Application validation run '999' does not contain a rate version for action code PA3"
      )
    })
  })

  describe('schema validation', () => {
    test('should return Joi validation details when woodland area fields are missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { error, message, validation }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          startDate: '2025-08-05'
        }
      })

      expect(statusCode).toBe(400)
      expect(error).toBe('Bad Request')
      expect(message).toBe(
        '"oldWoodlandAreaHa" is required. "newWoodlandAreaHa" is required'
      )
      expect(validation).toEqual({
        source: 'payload',
        keys: ['oldWoodlandAreaHa', 'newWoodlandAreaHa']
      })
    })

    test('should return 400 when parcelIds is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { oldWoodlandAreaHa: 5, newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"parcelIds" is required')
    })

    test('should return 400 when parcelIds is an empty array', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: [], oldWoodlandAreaHa: 5, newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"parcelIds" must contain at least 1 items')
    })

    test('should return 400 when oldWoodlandAreaHa is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: ['SX067-99238'], newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"oldWoodlandAreaHa" is required')
    })

    test('should return 400 when oldWoodlandAreaHa is negative', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          oldWoodlandAreaHa: -1,
          newWoodlandAreaHa: 3
        }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe(
        '"oldWoodlandAreaHa" must be greater than or equal to 0'
      )
    })

    test('should return 400 when newWoodlandAreaHa is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: ['SX067-99238'], oldWoodlandAreaHa: 5 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"newWoodlandAreaHa" is required')
    })

    test('should return 400 when newWoodlandAreaHa is negative', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          oldWoodlandAreaHa: 5,
          newWoodlandAreaHa: -1
        }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe(
        '"newWoodlandAreaHa" must be greater than or equal to 0'
      )
    })

    test('should return 400 when both version and validationRunId are supplied', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          ...validPayload,
          version: '1.0.0',
          validationRunId: 42
        }
      })

      expect(statusCode).toBe(400)
      expect(result.message).toContain(
        'must not contain both "version" and "validationRunId"'
      )
    })

    test('should return 400 when version is not a semantic version', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, version: 'latest' }
      })

      expect(statusCode).toBe(400)
      expect(result.message).toBe(
        '"version" with value "latest" fails to match the semantic version pattern'
      )
    })

    test('should return 400 when validationRunId is not a positive integer', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { ...validPayload, validationRunId: 1.5 }
      })

      expect(statusCode).toBe(400)
      expect(result.message).toBe('"validationRunId" must be an integer')
    })
  })

  describe('error handling', () => {
    test('should return 500 when rate version resolution throws', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockRejectedValue(
        new Error('Database error')
      )

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(500)
    })

    test('should return 500 when the calculation service throws unexpectedly', async () => {
      mockWmpPaymentCalculateTransformer.mockImplementation(() => {
        throw new Error('Unexpected transformer error')
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(500)
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        expect.objectContaining({
          parcelIds: ['SX067-99238'],
          error: 'Unexpected transformer error'
        }),
        'failure',
        expect.objectContaining({ method: 'post' })
      )
    })
  })
})
