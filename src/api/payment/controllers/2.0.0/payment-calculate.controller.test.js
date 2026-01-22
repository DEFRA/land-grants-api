import Hapi from '@hapi/hapi'
import { payments } from '~/src/api/payment/index.js'
import { getPaymentCalculationForParcels } from '~/src/payment-calculation/paymentCalculation.js'
import { validateRequest } from '~/src/api/application/validation/application.validation.js'
import { getActionsByLatestVersion } from '~/src/api/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { vi } from 'vitest'

vi.mock('~/src/api/application/validation/application.validation.js')
vi.mock('~/src/api/actions/queries/2.0.0/getActionsByLatestVersion.query.js')

const mockValidateRequest = validateRequest
const mockGetActionsByLatestVersion = getActionsByLatestVersion

const mockLandActions = {
  sbi: '123456789',
  parcel: [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        {
          code: 'BND1',
          quantity: 99.0
        },
        {
          code: 'BND2',
          quantity: 200.0
        }
      ]
    }
  ]
}

vi.mock('~/src/payment-calculation/paymentCalculation.js')

const mockGetPaymentCalculationForParcels = getPaymentCalculationForParcels
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

describe('Payment calculate controller V2', () => {
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

    await server.register([payments])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockValidateRequest.mockResolvedValue([])
    mockGetPaymentCalculationForParcels.mockReturnValue(validResponse)
    mockGetActionsByLatestVersion.mockResolvedValue([
      {
        version: 1,
        startDate: '2025-01-01',
        code: 'BND1',
        durationYears: 3,
        description: 'BND1',
        applicationUnitOfMeasurement: 'ha',
        enabled: true,
        display: true,
        payment: {
          ratePerUnitGbp: 10.6,
          ratePerAgreementPerYearGbp: 272
        }
      }
    ])
  })

  describe('POST /api/v2/payments/calculate route', () => {
    test('should return 200 if the request has a valid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
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
        url: '/api/v2/payments/calculate',
        payload: {
          parcel: null
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

    test('should return 422 if the request has invalid quantity', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: {
          sbi: '123456789',
          parcel: [
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              actions: [
                {
                  code: 'BND1',
                  quantity: -99.0
                }
              ]
            }
          ]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(422)
      expect(message).toBe('Quantity must be a positive number')
    })

    test('should return 400 if the request has no land actions in payload', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: {
          parcel: {
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

    test('should return 400 if there is an error validating land data', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: mockLandActions
      }

      mockValidateRequest.mockResolvedValue(['Error validating data'])
      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Error validating data')
    })

    test('should return 400 if the request has an invalid land action', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: {
          parcel: []
        }
      }

      mockGetPaymentCalculationForParcels.mockReturnValue(null)

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

    test('should return 400 if totalDurationYears is 0 (no enabled actions match)', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: mockLandActions
      }

      // Mock enabledActions with no matching action codes
      mockGetActionsByLatestVersion.mockResolvedValue([
        {
          version: 1,
          startDate: '2025-01-01',
          code: 'DIFFERENT_CODE',
          durationYears: 3,
          description: 'Different action',
          applicationUnitOfMeasurement: 'ha',
          enabled: true,
          display: true,
          payment: {
            ratePerUnitGbp: 10.6,
            ratePerAgreementPerYearGbp: 272
          }
        }
      ])

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Error getting actions information')
    })

    test('should return 400 if getPaymentCalculationForParcels returns null', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: mockLandActions
      }

      mockGetPaymentCalculationForParcels.mockReturnValue(null)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Unable to calculate payment')
    })

    test('should return 500 if an unexpected error occurs', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/payments/calculate',
        payload: mockLandActions
      }

      const errorMessage = 'Database connection failed'
      mockGetActionsByLatestVersion.mockRejectedValue(new Error(errorMessage))

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })
  })
})
