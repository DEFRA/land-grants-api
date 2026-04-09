import Hapi from '@hapi/hapi'
import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { executeRulesForPaymentCalculationWMP } from '../service/wmp-payment-calculate.service.js'
import { executePaymentMethod } from '../../payments-engine/paymentsEngine.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock('../service/wmp-payment-calculate.service.js')
vi.mock('../../payments-engine/paymentsEngine.js')
vi.mock('../transformer/wmp-payment-calculate.transformer.js')

const mockGetLandData = getLandData
const mockGetActionsByLatestVersion = getActionsByLatestVersion
const mockExecuteRulesForPaymentCalculationWMP =
  executeRulesForPaymentCalculationWMP
const mockExecutePaymentMethod = executePaymentMethod
const mockWmpPaymentCalculateTransformer = wmpPaymentCalculateTransformer

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
  semanticVersion: '1.0.0',
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
      version: '1.0.0',
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
  const server = Hapi.server()

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
    mockGetActionsByLatestVersion.mockResolvedValue([createMockAction()])
    mockExecuteRulesForPaymentCalculationWMP.mockReturnValue({
      ruleResult: { passed: true, results: [] },
      totalParcelAreaSqm: 8
    })
    mockExecutePaymentMethod.mockReturnValue(createMockCalculationResult())
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
      expect(mockExecutePaymentMethod).toHaveBeenCalledWith(
        createMockAction().paymentMethod,
        {
          data: {
            totalParcelArea: 8,
            oldWoodlandAreaHa: 5,
            newWoodlandAreaHa: 3,
            startDate: expect.any(Date)
          }
        }
      )
      expect(mockWmpPaymentCalculateTransformer).toHaveBeenCalledWith(
        ['SX067-99238'],
        createMockCalculationResult(),
        expect.objectContaining({ code: 'PA3' }),
        expect.any(Date)
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
  })

  describe('validation errors', () => {
    test('should return 400 when eligibility rules fail', async () => {
      mockExecuteRulesForPaymentCalculationWMP.mockReturnValue({
        ruleResult: {
          passed: false,
          results: [{ name: 'rule1', passed: false }]
        },
        totalParcelAreaSqm: 8
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
      expect(message).toBe('Eligibility rules failed')
    })

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
    })

    test('should return 400 when no PA3 action exists', async () => {
      mockGetActionsByLatestVersion.mockResolvedValue([])

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

    test('should return 400 when actions do not include PA3', async () => {
      mockGetActionsByLatestVersion.mockResolvedValue([
        { ...createMockAction(), code: 'PA1' }
      ])

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
  })

  describe('schema validation', () => {
    test('should return 400 when parcelIds is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { oldWoodlandAreaHa: 5, newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
    })

    test('should return 400 when parcelIds is an empty array', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: [], oldWoodlandAreaHa: 5, newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
    })

    test('should return 400 when oldWoodlandAreaHa is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: ['SX067-99238'], newWoodlandAreaHa: 3 }
      })

      expect(statusCode).toBe(400)
    })

    test('should return 400 when oldWoodlandAreaHa is negative', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          oldWoodlandAreaHa: -1,
          newWoodlandAreaHa: 3
        }
      })

      expect(statusCode).toBe(400)
    })

    test('should return 400 when newWoodlandAreaHa is missing', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: { parcelIds: ['SX067-99238'], oldWoodlandAreaHa: 5 }
      })

      expect(statusCode).toBe(400)
    })

    test('should return 400 when newWoodlandAreaHa is negative', async () => {
      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: {
          parcelIds: ['SX067-99238'],
          oldWoodlandAreaHa: 5,
          newWoodlandAreaHa: -1
        }
      })

      expect(statusCode).toBe(400)
    })
  })

  describe('error handling', () => {
    test('should return 500 when getActionsByLatestVersion throws', async () => {
      mockGetActionsByLatestVersion.mockRejectedValue(
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

    test('should return 500 when executePaymentMethod throws', async () => {
      mockExecutePaymentMethod.mockImplementation(() => {
        throw new Error('Calculation error')
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/api/v1/wmp/payments/calculate',
        payload: validPayload
      })

      expect(statusCode).toBe(500)
    })
  })
})
