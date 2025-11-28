/* eslint-disable no-console */
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import {
  getPaymentCalculationDataRequirements,
  getPaymentCalculationForParcels
} from '../payment-calculation/paymentCalculation.js'
import { getPaymentCalculationFixtures } from './setup/getPaymentCalculationFixtures.js'

const logger = {
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error
}

let connection

describe('Calculate payments', () => {
  const fixtures = getPaymentCalculationFixtures()

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test.each(fixtures)(
    `%p`,
    async (
      name,
      {
        parcels: parcelsStr,
        dateToday,
        expectedPaymentAnnual,
        expectedPaymentAgreement,
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

      let parcels = []
      try {
        parcels = JSON.parse(parcelsStr)
      } catch (e) {
        logger.error(`Error parsing parcels in CSV file`)
      }

      const durationYears = 3
      const { enabledActions } = await getPaymentCalculationDataRequirements(
        connection,
        logger
      )

      const result = getPaymentCalculationForParcels(
        parcels,
        enabledActions,
        durationYears
      )

      const firstPayment = result.payments[0]
      const secondPayment = result.payments[1]

      expect(result.annualTotalPence).toEqual(Number(expectedPaymentAnnual))
      expect(result.agreementTotalPence).toEqual(
        Number(expectedPaymentAgreement)
      )

      expect(firstPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentFirstQuarter)
      )
      expect(secondPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentOtherQuarters)
      )

      // does the sum of individual payment line items match the totalPaymentPence for the instalment?
      for (const payment of result.payments) {
        const sumOfTotalLineItems = payment.lineItems.reduce(
          (acc, item) => acc + item.paymentPence,
          0
        )
        expect(sumOfTotalLineItems).toEqual(payment.totalPaymentPence)
      }

      // does the sum of total payments match the agreement total during the agreement length?
      const sumOfTotalsForInstalments = result.payments.reduce(
        (acc, p) => acc + p.totalPaymentPence,
        0
      )
      expect(sumOfTotalsForInstalments).toEqual(result.agreementTotalPence)

      // dates
      expect(result.agreementStartDate).toEqual(expectedStartDate)
      expect(result.agreementEndDate).toEqual(expectedEndDate)
      expect(firstPayment.paymentDate).toEqual(expectedFirstPaymentDate)
    }
  )
})
