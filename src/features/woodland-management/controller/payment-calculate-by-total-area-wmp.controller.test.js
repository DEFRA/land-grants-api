import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { calculateWMPPaymentWithRateVersion } from '../service/wmp-rate-version.service.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import createTestServer from '~/src/tests/test-server.js'
import {
  AuditEvent,
  auditEvent
} from '~/src/features/common/helpers/audit-event.js'

vi.mock('../service/wmp-rate-version.service.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    calculateWMPPaymentWithRateVersion: vi.fn()
  }
})
vi.mock('../transformer/wmp-payment-calculate.transformer.js')
vi.mock('~/src/features/common/helpers/audit-event.js')

const mockCalculateWMPPaymentWithRateVersion =
  calculateWMPPaymentWithRateVersion
const mockWmpPaymentCalculateTransformer = wmpPaymentCalculateTransformer
const mockAuditEvent = auditEvent

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
      parcelIds: [],
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
  totalAreaHa: 8,
  applicationId: 'app-123',
  sbi: '123456789'
}

describe('Payment calculate total WMP controller', () => {
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
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: validPayload
      })

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(payment).toEqual(createMockPaymentResponse())
      expect(mockCalculateWMPPaymentWithRateVersion).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { totalWoodlandAreaSqm: 8 * 10000 },
        { version: undefined }
      )
      expect(mockWmpPaymentCalculateTransformer).toHaveBeenCalledWith(
        [],
        createMockCalculationResult(),
        createMockAction(),
        undefined
      )
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
        expect.objectContaining({
          identifiers: { sbi: '123456789', crn: undefined },
          request: {
            totalAreaHa: 8,
            applicationId: 'app-123',
            sbi: '123456789',
            crn: undefined,
            rateVersion: null,
            rateVersionSource: 'latest'
          },
          response: createMockPaymentResponse()
        }),
        'success',
        expect.objectContaining({ method: 'post' })
      )
    })

    test('should return 200 when crn is not provided', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: {
          totalAreaHa: 8,
          applicationId: 'app-123',
          sbi: '123456789'
        }
      })

      expect(statusCode).toBe(200)
    })

    test('should pass startDate to the payment transformer when provided', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: { ...validPayload, startDate: '2024-06-01' }
      })

      expect(statusCode).toBe(200)
      expect(mockWmpPaymentCalculateTransformer).toHaveBeenCalledWith(
        [],
        createMockCalculationResult(),
        createMockAction(),
        new Date('2024-06-01')
      )
    })

    test('should pin the rate to an explicit version and record it in the audit event', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockResolvedValue({
        paymentResult: createMockCalculationResult(),
        action: createMockAction(),
        rateVersion: { value: '1.0.0', source: 'explicit' }
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: { ...validPayload, version: '1.0.0' }
      })

      expect(statusCode).toBe(200)
      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
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
  })

  describe('schema validation', () => {
    test('should return 400 when totalAreaHa is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: {
          applicationId: 'app-123',
          sbi: '123456789'
        }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"totalAreaHa" is required')
    })

    test('should return 400 when totalAreaHa is negative', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: { ...validPayload, totalAreaHa: -1 }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"totalAreaHa" must be greater than or equal to 0')
    })

    test('should return 400 when applicationId is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: {
          totalAreaHa: 8,
          sbi: '123456789'
        }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"applicationId" is required')
    })

    test('should return 400 when sbi is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: {
          totalAreaHa: 8,
          applicationId: 'app-123'
        }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe('"sbi" is required')
    })

    test('should return 400 when version is not a semantic version', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: { ...validPayload, version: 'not-a-version' }
      })

      expect(statusCode).toBe(400)
      expect(result.message).toBe(
        '"version" with value "not-a-version" fails to match the semantic version pattern'
      )
    })
  })

  describe('rate version resolution errors', () => {
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
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: { ...validPayload, version: '9.9.9' }
      })

      expect(statusCode).toBe(400)
      expect(message).toBe("Action config for PA3 at version '9.9.9' not found")
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
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: validPayload
      })

      expect(statusCode).toBe(500)
    })

    test('should return 500 when wmpPaymentCalculateTransformer throws', async () => {
      mockWmpPaymentCalculateTransformer.mockImplementation(() => {
        throw new Error('Unexpected transformer error')
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: validPayload
      })

      expect(statusCode).toBe(500)
    })

    test('should publish a failure audit event when calculation fails', async () => {
      mockCalculateWMPPaymentWithRateVersion.mockRejectedValue(
        new Error('Database error')
      )

      await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate-by-total-area',
        payload: validPayload
      })

      expect(mockAuditEvent).toHaveBeenCalledWith(
        AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
        expect.objectContaining({
          identifiers: { sbi: '123456789', crn: undefined },
          request: {
            totalAreaHa: 8,
            applicationId: 'app-123',
            sbi: '123456789',
            crn: undefined,
            rateVersion: null,
            rateVersionSource: 'latest'
          },
          error: 'Database error'
        }),
        'failure',
        expect.objectContaining({ method: 'post' })
      )
    })
  })
})
