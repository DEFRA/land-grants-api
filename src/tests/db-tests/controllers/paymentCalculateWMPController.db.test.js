/* eslint-disable no-console */
import { vi } from 'vitest'
import { PaymentsCalculateWMPControllerV2 } from '~/src/features/woodland-management/controller/payment-calculate-wmp.controller.js'
import { validatePaymentCalculationRequest } from '~/src/features/woodland-management/validation/payment-calculation.validation.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'

vi.mock(
  '~/src/features/woodland-management/validation/payment-calculation.validation.js'
)

const mockValidatePaymentCalculationRequest = validatePaymentCalculationRequest

/**
 * Creates a mock parcel with the given area in square metres.
 * @param {number} areaSqm - The area of the parcel in square metres
 * @returns {object} A mock land parcel database object
 */
const createMockParcel = (areaSqm = 200000) => ({
  id: 1,
  sheet_id: 'SX067',
  parcel_id: '99238',
  area_sqm: areaSqm,
  area: areaSqm,
  geom: 'POLYGON((0 0,1 0,1 1,0 1,0 0))',
  last_updated: new Date('2024-01-01')
})

/**
 * Builds the handler request object with the given payload.
 * @param {object} payload - The request payload
 * @param {object} logger - The logger instance
 * @param {object} connection - The database connection pool
 * @returns {object} The handler request object
 */
const createRequest = (payload, logger, connection) => ({
  payload,
  logger,
  server: {
    postgresDb: connection
  }
})
const mockDate = new Date(2026, 4, 1)

describe('Payment Calculate WMP Controller (DB)', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
    vi.setSystemTime(mockDate)
  })

  afterAll(async () => {
    await connection.end()
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockValidatePaymentCalculationRequest.mockResolvedValue({
      errors: null,
      parcels: [createMockParcel()]
    })
  })

  describe('successful calculation using PA3 action from database', () => {
    test('should return 200 with flat rate 150000p when eligible area falls in tier 1 (0.5–51ha)', async () => {
      // old=10ha, new=2ha → eligible=12ha → tier 1: flat £1500 (150000p), rate £0/ha
      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 10,
            newWoodlandAreaHa: 2,
            startDate: '2025-01-01'
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()
      const item = data.payment.agreementLevelItems[1]

      expect(statusCode).toBe(200)
      expect(data.message).toBe('success')
      expect(data.payment.agreementTotalPence).toBe(150000)
      expect(data.payment.frequency).toBe('Single')
      expect(data.payment.agreementStartDate).toBe('2025-02-01')
      expect(data.payment.agreementEndDate).toBe('2035-01-31')
      expect(data.payment.payments[0].totalPaymentPence).toBe(150000)
      expect(data.payment.payments[0].paymentDate).toBe(null)
      expect(item.activePaymentTier).toBe(1)
      expect(item.quantityInActiveTier).toBe(12)
      expect(item.activeTierRatePence).toBe(0)
      expect(item.activeTierFlatRatePence).toBe(150000)
    })

    test('should return 200 with 240000p when eligible area falls in tier 2 (51–100ha)', async () => {
      // old=75ha, new=5ha → eligible=80ha → tier 2: 1500 + 30*(80-50) = £2400 (240000p)
      // parcel area must be >= total woodland (80ha = 800000sqm)
      mockValidatePaymentCalculationRequest.mockResolvedValue({
        errors: null,
        parcels: [createMockParcel(900000)]
      })

      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 75,
            newWoodlandAreaHa: 5,
            startDate: '2025-06-01'
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()
      const item = data.payment.agreementLevelItems[1]

      expect(statusCode).toBe(200)
      expect(data.payment.agreementTotalPence).toBe(240000)
      expect(data.payment.agreementStartDate).toBe('2025-07-01')
      expect(data.payment.agreementEndDate).toBe('2035-06-30')
      expect(item.activePaymentTier).toBe(2)
      expect(item.quantityInActiveTier).toBe(30)
      expect(item.activeTierRatePence).toBe(3000)
      expect(item.activeTierFlatRatePence).toBe(150000)
    })

    test('should return 200 with 315000p when eligible area falls in tier 3 (over 100ha)', async () => {
      // old=90ha, new=20ha, total=110ha, 20% cap=22ha → new(20)≤cap(22) → eligible=110ha
      // tier 3: 3000 + 15*(110-100) = £3150 (315000p)
      // parcel area must be >= total woodland (110ha = 1100000sqm)
      mockValidatePaymentCalculationRequest.mockResolvedValue({
        errors: null,
        parcels: [createMockParcel(1200000)]
      })

      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 90,
            newWoodlandAreaHa: 20,
            startDate: '2025-03-01'
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()
      const item = data.payment.agreementLevelItems[1]

      expect(statusCode).toBe(200)
      expect(data.payment.agreementTotalPence).toBe(315000)
      expect(data.payment.agreementStartDate).toBe('2025-04-01')
      expect(data.payment.agreementEndDate).toBe('2035-03-31')
      expect(item.activePaymentTier).toBe(3)
      expect(item.quantityInActiveTier).toBe(10)
      expect(item.activeTierRatePence).toBe(1500)
      expect(item.activeTierFlatRatePence).toBe(300000)
    })

    test('should return 200 and cap new woodland when it exceeds 20% of total woodland area', async () => {
      // old=20ha, new=30ha, total=50ha, 20% cap=10ha → eligible = 20+10 = 30ha
      // tier 1: flat £1500
      // parcel area must be >= total woodland (50ha = 500000sqm)
      mockValidatePaymentCalculationRequest.mockResolvedValue({
        errors: null,
        parcels: [createMockParcel(600000)]
      })

      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 20,
            newWoodlandAreaHa: 30,
            startDate: '2025-01-01'
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()

      expect(statusCode).toBe(200)
      expect(data.payment.agreementTotalPence).toBe(150000)
    })

    test('should return 200 when eligible area falls in tier 3 (over 100ha) and round quantity active tier', async () => {
      mockValidatePaymentCalculationRequest.mockResolvedValue({
        errors: null,
        parcels: [createMockParcel(900000)]
      })

      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 100.1,
            newWoodlandAreaHa: 0,
            startDate: '2025-06-01'
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()
      const item = data.payment.agreementLevelItems[1]

      expect(statusCode).toBe(200)
      expect(data.payment.agreementTotalPence).toBe(300150)
      expect(data.payment.agreementStartDate).toBe('2025-07-01')
      expect(data.payment.agreementEndDate).toBe('2035-06-30')
      expect(item.activePaymentTier).toBe(3)
      expect(item.quantityInActiveTier).toBe(0.1)
      expect(item.activeTierRatePence).toBe(1500)
      expect(item.activeTierFlatRatePence).toBe(300000)
    })

    test('should return 200 with correct end date and start is not sent', async () => {
      mockValidatePaymentCalculationRequest.mockResolvedValue({
        errors: null,
        parcels: [createMockParcel(600000)]
      })

      const { h, getResponse } = createResponseCapture()

      await PaymentsCalculateWMPControllerV2.handler(
        createRequest(
          {
            parcelIds: ['SX067-99238'],
            oldWoodlandAreaHa: 20,
            newWoodlandAreaHa: 30
          },
          logger,
          connection
        ),
        h
      )

      const { data, statusCode } = getResponse()

      expect(statusCode).toBe(200)
      expect(data.payment.agreementEndDate).toBe('2036-05-31')
    })
  })

  describe('eligibility rule failures', () => {
    describe('validation errors', () => {
      test('should return a Boom 400 when parcel validation returns errors', async () => {
        mockValidatePaymentCalculationRequest.mockResolvedValue({
          errors: ['Land parcels not found: SX067-99238'],
          parcels: []
        })

        const { h } = createResponseCapture()

        const result = await PaymentsCalculateWMPControllerV2.handler(
          createRequest(
            {
              parcelIds: ['SX067-99238'],
              oldWoodlandAreaHa: 10,
              newWoodlandAreaHa: 2,
              startDate: '2025-01-01'
            },
            logger,
            connection
          ),
          h
        )

        expect(result.isBoom).toBe(true)
        expect(result.output.statusCode).toBe(400)
        expect(result.message).toBe('Land parcels not found: SX067-99238')
      })
    })
  })
})
