/* eslint-disable no-console */
import { PaymentsCalculateControllerV1 as PaymentsCalculateController } from '~/src/features/payment/controllers/1.0.0/payment-calculate.controller.js'
import { getEnabledActions } from '~/src/features/actions/queries/getActions.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { getPaymentCalculationFixtures } from '~/src/tests/db-tests/setup/getPaymentCalculationFixtures.js'
import { validateRequest } from '~/src/features/application/validation/application.validation.js'
import { vi } from 'vitest'

vi.mock('~/src/features/application/validation/application.validation.js')
vi.mock('~/src/features/actions/queries/getActions.query.js')

const mockValidateRequest = validateRequest
const mockGetEnabledActions = getEnabledActions
const landCoverClassCodes = [
  '130',
  '240',
  '250',
  '270',
  '280',
  '300',
  '330',
  '580',
  '590',
  '620',
  '640',
  '650'
]

const actions = [
  {
    enabled: true,
    code: 'CMOR1',
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1
  },
  {
    enabled: true,
    code: 'UPL1',
    payment: {
      ratePerUnitGbp: 20
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1
  },
  {
    enabled: true,
    code: 'UPL2',
    payment: {
      ratePerUnitGbp: 53
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1
  },
  {
    enabled: true,
    code: 'UPL3',
    payment: {
      ratePerUnitGbp: 66
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1
  },
  {
    enabled: true,
    code: 'CSAM1',
    payment: {
      ratePerUnitGbp: 6,
      ratePerAgreementPerYearGbp: 97
    },
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    landCoverClassCodes,
    startDate: '2025-01-01',
    version: 1
  }
]

describe('Payment Controller', () => {
  let logger, connection
  const fixtures = getPaymentCalculationFixtures()
  const { h, getResponse } = createResponseCapture()

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  beforeEach(() => {
    mockValidateRequest.mockResolvedValue([])
    mockGetEnabledActions.mockResolvedValue(actions)
  })

  afterAll(async () => {
    await connection.end()
  })

  test.each(fixtures)(
    `%s`,
    async (
      name,
      {
        parcels: parcelsStr,
        dateToday,
        expectedPaymentAnnual,
        expectedPaymentFirstQuarter,
        expectedPaymentOtherQuarters,
        expectedStartDate,
        expectedEndDate,
        expectedFirstPaymentDate
      }
    ) => {
      vi.useFakeTimers({
        doNotFake: ['nextTick']
      }).setSystemTime(new Date(dateToday))

      await PaymentsCalculateController.handler(
        {
          payload: { parcel: JSON.parse(parcelsStr) },
          logger,
          server: {
            postgresDb: connection
          }
        },
        h
      )

      const {
        data: { payment },
        statusCode
      } = getResponse()

      expect(statusCode).toBe(200)
      const firstPayment = payment.payments[0]
      const secondPayment = payment.payments[1]

      expect(payment.annualTotalPence).toEqual(Number(expectedPaymentAnnual))
      expect(firstPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentFirstQuarter)
      )
      expect(secondPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentOtherQuarters)
      )
      expect(payment.agreementStartDate).toEqual(expectedStartDate)
      expect(payment.agreementEndDate).toEqual(expectedEndDate)
      expect(payment.annualTotalPence).toEqual(Number(expectedPaymentAnnual))
      expect(firstPayment.paymentDate).toEqual(expectedFirstPaymentDate)
      expect(payment.parcelItems[1].version).toBe(1)
    }
  )
})
