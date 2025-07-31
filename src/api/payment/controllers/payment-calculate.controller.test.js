import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { payments } from '~/src/api/payment/index.js'
import {
  getPaymentCalculationDataRequirements,
  getPaymentCalculationForParcels
} from '~/src/payment-calculation/paymentCalculation.js'

jest.mock('~/src/payment-calculation/paymentCalculation.js')

const mockGetPaymentCalculationForParcels = getPaymentCalculationForParcels
const mockGetPaymentCalculationDataRequirements =
  getPaymentCalculationDataRequirements
const validResponse = {
  agreementStartDate: '2025-08-01',
  agreementEndDate: '2028-08-01',
  frequency: 'Quarterly',
  agreementTotalPence: 300000,
  annualTotalPence: 100000,
  parcelItems: {
    1: {
      code: 'CSAM1',
      description:
        'Assess soil, test soil organic matter and produce a soil management plan',
      unit: 'Hectare',
      quantity: 10.63,
      rateInPence: 600,
      annualPaymentPence: 12000,
      sheetId: 'SD2324',
      parcelId: '1253'
    }
  },
  agreementLevelItems: {
    1: {
      code: 'CMOR1',
      description:
        'Assess moorland and produce a written record - Agreement level part',
      annualPaymentPence: 27200
    }
  },
  payments: [
    {
      totalPaymentPence: 25000,
      paymentDate: '2025-08-05',
      lineItems: [
        {
          parcelItemId: 1,
          paymentPence: 1000
        },
        {
          agreementLevelItemId: 1,
          paymentPence: 2266
        }
      ]
    }
  ]
}

describe('Payment calculate controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    await server.register([payments])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    mockGetPaymentCalculationForParcels.mockReturnValue(validResponse)
    await mockGetPaymentCalculationDataRequirements.mockResolvedValue({
      enabledActions: []
    })
  })

  describe('GET /payments/calculate route', () => {
    test('should return 200 if the request has a valid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
    })

    test('should return 400 if the request has an invalid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: {
          landActions: null
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should return 400 if the request has no land actions in payload', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: {
          landActions: {
            actions: []
          }
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should return 400 if the request has an invalid land action', async () => {
      const request = {
        method: 'POST',
        url: '/payments/calculate',
        payload: {
          landActions: []
        }
      }

      getPaymentCalculationForParcels.mockResolvedValue(null)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe(
        'Error calculating payment land actions, no land or actions data provided'
      )
    })
  })
})
