import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { calculateWMPPayment } from '../service/wmp-service.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import createTestServer from '~/src/tests/test-server.js'
import {
  AuditEvent,
  auditEvent
} from '~/src/features/common/helpers/audit-event.js'

vi.mock('../service/wmp-service.js')
vi.mock('../transformer/wmp-payment-calculate.transformer.js')
vi.mock('~/src/features/common/helpers/audit-event.js')

const mockCalculateWMPPayment = calculateWMPPayment
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
    mockCalculateWMPPayment.mockResolvedValue({
      result: createMockCalculationResult(),
      action: createMockAction()
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
      expect(mockCalculateWMPPayment).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        { totalWoodlandAreaSqm: 8 * 10000 }
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
            crn: undefined
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
  })

  describe('error handling', () => {
    test('should return 500 when calculateWMPPayment throws', async () => {
      mockCalculateWMPPayment.mockRejectedValue(new Error('Action not found'))

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
      mockCalculateWMPPayment.mockRejectedValue(new Error('Action not found'))

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
            crn: undefined
          },
          error: 'Action not found'
        }),
        'failure',
        expect.objectContaining({ method: 'post' })
      )
    })
  })
})
