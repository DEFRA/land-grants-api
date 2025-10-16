import Hapi from '@hapi/hapi'
import { parcel } from '~/src/api/parcel/index.js'
import { getParcelActionsWithAvailableArea } from '~/src/api/parcel/service/parcel.service.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { getDataAndValidateRequest } from '~/src/api/parcel/validation/parcel.validation.js'

jest.mock('~/src/api/parcel/validation/parcel.validation.js')
jest.mock('~/src/api/parcel/service/parcel.service.js')
jest.mock('~/src/api/agreements/queries/getAgreementsForParcel.query.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')

const mockGetDataAndValidateRequest = getDataAndValidateRequest
const mockGetParcelActionsWithAvailableArea = getParcelActionsWithAvailableArea
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockCreateCompatibilityMatrix = createCompatibilityMatrix

const mockParcelData = {
  sheet_id: 'SX0679',
  parcel_id: '9238',
  area_sqm: 100000
}

const mockEnabledActions = [
  {
    code: 'BND1',
    description: 'Hedgerow management',
    display: true,
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    }
  },
  {
    code: 'BND2',
    description: 'Hedge laying',
    display: true,
    payment: {
      ratePerUnitGbp: 20.5,
      ratePerAgreementPerYearGbp: 0
    }
  }
]

const mockAgreements = [
  {
    actionCode: 'BND1',
    quantity: 5,
    unit: 'ha'
  }
]

const mockActionsWithAvailableArea = [
  {
    code: 'BND1',
    description: 'Hedgerow management',
    availableArea: {
      unit: 'ha',
      value: 10
    },
    ratePerUnitGbp: 10.6,
    ratePerAgreementPerYearGbp: 272
  },
  {
    code: 'BND2',
    description: 'Hedge laying',
    availableArea: {
      unit: 'ha',
      value: 8
    },
    ratePerUnitGbp: 20.5,
    ratePerAgreementPerYearGbp: 0
  }
]

describe('Parcels Controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: jest.fn(),
      query: jest.fn()
    })

    await server.register([parcel])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [mockParcelData],
      enabledActions: mockEnabledActions
    })

    mockGetAgreementsForParcel.mockResolvedValue(mockAgreements)
    mockGetParcelActionsWithAvailableArea.mockResolvedValue(
      mockActionsWithAvailableArea
    )
    mockCreateCompatibilityMatrix.mockResolvedValue(jest.fn())
  })

  describe('POST /parcels route', () => {
    test('should return 200 with parcel data when requesting only size field', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['size']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toHaveLength(1)
      expect(parcels[0]).toEqual({
        parcelId: '9238',
        sheetId: 'SX0679',
        size: {
          unit: 'ha',
          value: 10
        }
      })
      expect(mockGetDataAndValidateRequest).toHaveBeenCalledWith(
        ['SX0679-9238'],
        expect.anything()
      )
    })

    test('should return 200 with parcel data when requesting actions field', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toHaveLength(1)
      expect(parcels[0]).toHaveProperty('actions')
      expect(parcels[0].actions).toHaveLength(2)
      expect(parcels[0].actions[0].code).toBe('BND1')
      expect(mockGetParcelActionsWithAvailableArea).toHaveBeenCalled()
    })

    test('should return 200 with parcel data when requesting actions.results field', async () => {
      const mockActionsWithResults = [
        {
          ...mockActionsWithAvailableArea[0],
          results: {
            totalValidLandCoverSqm: 50000,
            stacks: [],
            explanations: []
          }
        }
      ]

      mockGetParcelActionsWithAvailableArea.mockResolvedValue(
        mockActionsWithResults
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions.results']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toHaveLength(1)
      expect(parcels[0]).toHaveProperty('actions')
      expect(mockGetParcelActionsWithAvailableArea).toHaveBeenCalledWith(
        mockParcelData,
        expect.anything(),
        true, // showActionResults should be true
        mockEnabledActions,
        expect.any(Function),
        expect.anything(),
        expect.anything()
      )
    })

    test('should return 200 with plannedActions included', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions'],
          plannedActions: [
            {
              actionCode: 'BND2',
              quantity: 5.5,
              unit: 'ha'
            }
          ]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        expect.anything(),
        expect.anything()
      )
    })

    test('should return 200 and sort actions by code', async () => {
      const unsortedActions = [
        {
          code: 'UPL3',
          description: 'Action 3',
          availableArea: { unit: 'ha', value: 5 },
          ratePerUnitGbp: 10,
          ratePerAgreementPerYearGbp: 0
        },
        {
          code: 'BND1',
          description: 'Action 1',
          availableArea: { unit: 'ha', value: 10 },
          ratePerUnitGbp: 10.6,
          ratePerAgreementPerYearGbp: 272
        },
        {
          code: 'CSAM1',
          description: 'Action 2',
          availableArea: { unit: 'ha', value: 8 },
          ratePerUnitGbp: 15,
          ratePerAgreementPerYearGbp: 0
        }
      ]

      mockGetParcelActionsWithAvailableArea.mockResolvedValue(unsortedActions)

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(parcels[0].actions[0].code).toBe('BND1')
      expect(parcels[0].actions[1].code).toBe('CSAM1')
      expect(parcels[0].actions[2].code).toBe('UPL3')
    })

    test('should return 404 when parcel is not found', async () => {
      mockGetDataAndValidateRequest.mockResolvedValue({
        errors: ['Land parcels not found: SX0679-9999'],
        parcels: [],
        enabledActions: []
      })

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9999'],
          fields: ['size']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcels not found: SX0679-9999')
    })

    test('should return 404 when multiple parcels are not found', async () => {
      mockGetDataAndValidateRequest.mockResolvedValue({
        errors: ['Land parcels not found: SX0679-9999', 'Actions not found'],
        parcels: [],
        enabledActions: []
      })

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9999'],
          fields: ['size']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe(
        'Land parcels not found: SX0679-9999, Actions not found'
      )
    })

    test('should return 400 with invalid payload - missing parcelIds', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          fields: ['size']
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

    test('should return 400 with invalid payload - missing fields', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238']
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

    test('should return 400 with invalid parcelId format', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['invalid-parcel-id'],
          fields: ['size']
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

    test('should return 400 with invalid field value', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['invalid-field']
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

    test('should return 400 with invalid plannedActions - missing actionCode', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions'],
          plannedActions: [
            {
              quantity: 5.5,
              unit: 'ha'
            }
          ]
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

    test('should return 400 with invalid plannedActions - invalid unit', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions'],
          plannedActions: [
            {
              actionCode: 'BND2',
              quantity: 5.5,
              unit: 'invalid-unit'
            }
          ]
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

    test('should return 500 when createCompatibilityMatrix throws error', async () => {
      mockCreateCompatibilityMatrix.mockRejectedValue(
        new Error('Database connection error')
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when getParcelActionsWithAvailableArea throws error', async () => {
      mockGetParcelActionsWithAvailableArea.mockRejectedValue(
        new Error('Failed to get actions')
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when getAgreementsForParcel throws error', async () => {
      mockGetAgreementsForParcel.mockRejectedValue(
        new Error('Database query failed')
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 when getDataAndValidateRequest throws error', async () => {
      mockGetDataAndValidateRequest.mockRejectedValue(
        new Error('Validation service error')
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['size']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should call compatibility matrix creation with correct parameters', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      await server.inject(request)

      expect(mockCreateCompatibilityMatrix).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything()
      )
    })

    test('should call getAgreementsForParcel with correct parcel identifiers', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      await server.inject(request)

      expect(mockGetAgreementsForParcel).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        expect.anything(),
        expect.anything()
      )
    })

    test('should handle empty plannedActions array', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions'],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
    })

    test('should not include size when not requested in fields', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(parcels[0]).not.toHaveProperty('size')
      expect(parcels[0]).toHaveProperty('actions')
    })

    test('should not include actions when not requested in fields', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['size']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(parcels[0]).toHaveProperty('size')
      expect(parcels[0]).not.toHaveProperty('actions')
    })

    test('should handle validation errors', async () => {
      mockGetDataAndValidateRequest.mockResolvedValue({
        errors: ['Land parcels not found: SX0679-9999'],
        parcels: [],
        enabledActions: []
      })

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9999'],
          fields: ['size']
        }
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(404)
    })

    test('should handle handler exceptions', async () => {
      mockGetDataAndValidateRequest.mockRejectedValue(
        new Error('Unexpected error')
      )

      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['size']
        }
      }

      const { statusCode } = await server.inject(request)

      expect(statusCode).toBe(500)
    })
  })
})
