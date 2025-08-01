/* eslint-disable no-console */
import { PaymentsCalculateController } from '~/src/api/payment/controllers/payment-calculate.controller.js'

import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'
import { createResponseCapture } from './setup/utils.js'
import { getPaymentCalculationFixtures } from './setup/getPaymentCalculationFixtures.js'

const logger = {
  info: console.info,
  error: console.error,
  warn: console.warn,
  debug: console.debug
}

let connection

describe('payment calculate controller integration', () => {
  const fixtures = getPaymentCalculationFixtures()
  const { h, getResponse } = createResponseCapture()

  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      actions: true
    })
  }, 60000)

  afterAll(async () => {
    await resetDatabase(connection)
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
      jest
        .useFakeTimers({
          doNotFake: ['nextTick']
        })
        .setSystemTime(new Date(dateToday))

      await PaymentsCalculateController.handler(
        {
          payload: { landActions: JSON.parse(parcelsStr) },
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
    }
  )
})
