/* eslint-disable no-console */
import { vi } from 'vitest'
import { PaymentsCalculateControllerV2 as PaymentsCalculateController } from '~/src/features/payment/controllers/2.0.0/payment-calculate.controller.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { createResponseCapture } from '~/src/tests/db-tests/setup/utils.js'
import { getPaymentCalculationFixtures } from '~/src/tests/db-tests/setup/getPaymentCalculationFixtures.js'
import { validateRequest } from '~/src/features/application/validation/application.validation.js'
import { actions } from '../fixtures/actions.js'
import { getActions } from '~/src/features/actions/service/action.service.js'

vi.mock('~/src/features/application/validation/application.validation.js')
vi.mock('~/src/features/actions/service/action.service.js')

const mockValidateRequest = validateRequest
const mockGetActions = getActions

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
    mockGetActions.mockResolvedValue(actions)
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
        expectedStartDate,
        expectedEndDate,
        expectedPaymentAgreement
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
        data: { payment, message },
        statusCode
      } = getResponse()

      expect(statusCode).toBe(200)
      expect(message).toBe('success')

      expect(payment.agreementStartDate).toEqual(expectedStartDate)
      expect(payment.agreementEndDate).toEqual(expectedEndDate)
      expect(payment.annualTotalPence).toEqual(Number(expectedPaymentAnnual))
      expect(payment.agreementTotalPence).toEqual(
        Number(expectedPaymentAgreement)
      )
    }
  )
})
