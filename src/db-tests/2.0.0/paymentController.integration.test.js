/* eslint-disable no-console */
import { vi } from 'vitest'
import { PaymentsCalculateControllerV2 as PaymentsCalculateController } from '~/src/api/payment/controllers/2.0.0/payment-calculate.controller.js'
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import { createResponseCapture } from '../setup/utils.js'
import { getPaymentCalculationFixtures } from '../setup/getPaymentCalculationFixtures.js'
import { validateRequest } from '~/src/api/application/validation/application.validation.js'
import { logger } from '~/src/db-tests/setup/testLogger.js'

vi.mock('~/src/api/application/validation/application.validation.js')

const mockValidateRequest = validateRequest

describe('payment calculate controller v2 integration', () => {
  let connection
  const fixtures = getPaymentCalculationFixtures()
  const { h, getResponse } = createResponseCapture()

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  beforeEach(() => {
    mockValidateRequest.mockResolvedValue([])
  })

  afterAll(async () => {
    await connection.end()
  })

  test.each(fixtures)(
    `%p`,
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
      expect(payment.parcelItems[1].version).toBe('1.0.0')
    }
  )
})
