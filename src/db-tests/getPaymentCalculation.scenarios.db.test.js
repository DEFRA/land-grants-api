/* eslint-disable no-console */
import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'
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
      expect(firstPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentFirstQuarter)
      )
      expect(secondPayment.totalPaymentPence).toEqual(
        Number(expectedPaymentOtherQuarters)
      )

      expect(result.agreementStartDate).toEqual(expectedStartDate)
      expect(result.agreementEndDate).toEqual(expectedEndDate)
      expect(firstPayment.paymentDate).toEqual(expectedFirstPaymentDate)
    }
  )
})
