import Hapi from '@hapi/hapi'
import { parcel } from '~/src/features/parcel/index.js'
import {
  getActionsForParcel,
  getActionsForParcelWithSSSIConsentRequired,
  getActionsForParcelWithHEFERConsentRequired
} from '~/src/features/parcel/service/parcel.service.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { getDataAndValidateRequest } from '~/src/features/parcel/validation/2.0.0/parcel.validation.js'
import { vi } from 'vitest'

vi.mock('~/src/features/parcel/validation/2.0.0/parcel.validation.js')
vi.mock('~/src/features/parcel/service/parcel.service.js')
vi.mock('~/src/features/available-area/compatibilityMatrix.js')

const mockGetDataAndValidateRequest = getDataAndValidateRequest
const mockGetActionsForParcel = getActionsForParcel
const mockGetActionsForParcelWithSSSIConsentRequired =
  getActionsForParcelWithSSSIConsentRequired
const mockGetActionsForParcelWithHEFERConsentRequired =
  getActionsForParcelWithHEFERConsentRequired
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

describe('Parcels Controller 2.0.0', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })

    await server.register([parcel])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [mockParcelData],
      enabledActions: mockEnabledActions
    })

    mockGetActionsForParcel.mockImplementation((parcel, payload) => {
      const result = {
        parcelId: parcel.parcel_id,
        sheetId: parcel.sheet_id
      }

      if (payload.fields.includes('size')) {
        result.size = {
          unit: 'ha',
          value: 10
        }
      }

      if (payload.fields.some((f) => f.startsWith('actions'))) {
        result.actions = mockActionsWithAvailableArea
      }

      return Promise.resolve(result)
    })
    mockCreateCompatibilityMatrix.mockResolvedValue(vi.fn())
    mockGetActionsForParcelWithSSSIConsentRequired.mockImplementation(
      (parcelIds, responseParcels) => {
        return Promise.resolve(
          responseParcels.map((parcel) => ({
            ...parcel,
            actions: parcel.actions?.map((action) => ({
              ...action,
              sssiConsentRequired: action.code === 'BND1'
            }))
          }))
        )
      }
    )
    mockGetActionsForParcelWithHEFERConsentRequired.mockImplementation(
      (parcelIds, responseParcels) => {
        return Promise.resolve(
          responseParcels.map((parcel) => ({
            ...parcel,
            actions: parcel.actions?.map((action) => ({
              ...action,
              heferRequired: action.code === 'BND2'
            }))
          }))
        )
      }
    )
  })

  describe('POST /api/v2/parcels route', () => {
    test('should return 200 with parcel data when requesting only size field', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).not.toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).not.toHaveBeenCalled()
    })

    test('should return 200 with parcel data when requesting actions field', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      expect(mockGetActionsForParcel).toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).not.toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).not.toHaveBeenCalled()
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

      mockGetActionsForParcel.mockImplementation((parcel, payload) => {
        const result = {
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id
        }

        if (payload.fields.includes('size')) {
          result.size = {
            unit: 'ha',
            value: 10
          }
        }

        if (payload.fields.some((f) => f.startsWith('actions'))) {
          result.actions = mockActionsWithResults
        }

        return Promise.resolve(result)
      })

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      expect(mockGetActionsForParcel).toHaveBeenCalledWith(
        mockParcelData,
        expect.objectContaining({
          parcelIds: ['SX0679-9238'],
          fields: ['actions.results']
        }),
        true, // showActionResults should be true
        mockEnabledActions,
        expect.any(Function),
        expect.anything()
      )
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).not.toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).not.toHaveBeenCalled()
    })

    test('should return 200 and call getActionsForParcelWithSSSIConsentRequired when requesting actions.sssiConsentRequired with single parcel', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions', 'actions.sssiConsentRequired']
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
      expect(parcels[0].actions[0]).toHaveProperty('sssiConsentRequired')
      expect(parcels[0].actions[0].sssiConsentRequired).toBe(true)
      expect(parcels[0].actions[1].sssiConsentRequired).toBe(false)
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).toHaveBeenCalledWith(
        ['SX0679-9238'],
        expect.arrayContaining([
          expect.objectContaining({
            parcelId: '9238',
            sheetId: 'SX0679',
            actions: expect.any(Array)
          })
        ]),
        mockEnabledActions,
        expect.anything(),
        expect.anything()
      )
    })

    test('should return 400 when requesting actions.sssiConsentRequired with multiple parcels', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238', 'SX0679-9239'],
          fields: ['actions', 'actions.sssiConsentRequired']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe(
        'SSSI consent required is not supported for multiple parcels.'
      )
      expect(mockGetDataAndValidateRequest).not.toHaveBeenCalled()
      expect(mockGetActionsForParcel).not.toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).not.toHaveBeenCalled()
    })

    test('should not call getActionsForParcelWithSSSIConsentRequired when not requesting actions.sssiConsentRequired', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(
        mockGetActionsForParcelWithSSSIConsentRequired
      ).not.toHaveBeenCalled()
    })

    test('should return 200 and call getActionsForParcelWithHEFERConsentRequired when requesting actions.heferRequired', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions', 'actions.heferRequired']
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
      expect(parcels[0].actions[0]).toHaveProperty('heferRequired')
      expect(parcels[0].actions[0].heferRequired).toBe(false)
      expect(parcels[0].actions[1].heferRequired).toBe(true)
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).toHaveBeenCalledWith(
        ['SX0679-9238'],
        expect.arrayContaining([
          expect.objectContaining({
            parcelId: '9238',
            sheetId: 'SX0679',
            actions: expect.any(Array)
          })
        ]),
        mockEnabledActions,
        expect.anything(),
        expect.anything()
      )
    })

    test('should not call getActionsForParcelWithHEFERConsentRequired when not requesting actions.heferRequired', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).not.toHaveBeenCalled()
    })

    test('should return 200 with both sssiConsentRequired and heferRequired when both fields requested', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: [
            'actions',
            'actions.sssiConsentRequired',
            'actions.heferRequired'
          ]
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
      expect(parcels[0].actions[0]).toHaveProperty('sssiConsentRequired')
      expect(parcels[0].actions[0]).toHaveProperty('heferRequired')
      expect(parcels[0].actions[0].sssiConsentRequired).toBe(true)
      expect(parcels[0].actions[0].heferRequired).toBe(false)
      expect(parcels[0].actions[1].sssiConsentRequired).toBe(false)
      expect(parcels[0].actions[1].heferRequired).toBe(true)
      expect(mockGetActionsForParcelWithSSSIConsentRequired).toHaveBeenCalled()
      expect(
        mockGetActionsForParcelWithHEFERConsentRequired
      ).toHaveBeenCalledWith(
        ['SX0679-9238'],
        expect.arrayContaining([
          expect.objectContaining({
            parcelId: '9238',
            sheetId: 'SX0679',
            actions: expect.arrayContaining([
              expect.objectContaining({
                code: 'BND1',
                sssiConsentRequired: true
              }),
              expect.objectContaining({
                code: 'BND2',
                sssiConsentRequired: false
              })
            ])
          })
        ]),
        mockEnabledActions,
        expect.anything(),
        expect.anything()
      )
    })

    test('should return 200 with plannedActions included', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      expect(mockGetActionsForParcel).toHaveBeenCalledWith(
        mockParcelData,
        expect.objectContaining({
          parcelIds: ['SX0679-9238'],
          fields: ['actions'],
          plannedActions: [
            {
              actionCode: 'BND2',
              quantity: 5.5,
              unit: 'ha'
            }
          ]
        }),
        false,
        mockEnabledActions,
        expect.any(Function),
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

      // Mock to return sorted actions (since sorting happens in getActionsForParcel)
      const sortedActions = [...unsortedActions].sort((a, b) =>
        a.code.localeCompare(b.code)
      )

      mockGetActionsForParcel.mockImplementation((parcel, payload) => {
        const result = {
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id
        }

        if (payload.fields.includes('size')) {
          result.size = {
            unit: 'ha',
            value: 10
          }
        }

        if (payload.fields.some((f) => f.startsWith('actions'))) {
          result.actions = sortedActions
        }

        return Promise.resolve(result)
      })

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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

    test('should return 500 when getActionsForParcel throws error', async () => {
      mockGetActionsForParcel.mockRejectedValue(
        new Error('Failed to get actions')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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

    test('should return 500 when getActionsForParcelWithSSSIConsentRequired throws error', async () => {
      mockGetActionsForParcelWithSSSIConsentRequired.mockRejectedValue(
        new Error('Failed to get SSSI consent required')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions', 'actions.sssiConsentRequired']
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

    test('should return 500 when getActionsForParcelWithHEFERConsentRequired throws error', async () => {
      mockGetActionsForParcelWithHEFERConsentRequired.mockRejectedValue(
        new Error('Failed to get HEFER consent required')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions', 'actions.heferRequired']
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

    test('should return 500 when getActionsForParcel throws error from getAgreementsForParcel', async () => {
      mockGetActionsForParcel.mockRejectedValue(
        new Error('Database query failed')
      )

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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

    test('should call getActionsForParcel with correct parcel data', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
        payload: {
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }
      }

      await server.inject(request)

      expect(mockGetActionsForParcel).toHaveBeenCalledWith(
        mockParcelData,
        expect.objectContaining({
          parcelIds: ['SX0679-9238'],
          fields: ['actions']
        }),
        false,
        mockEnabledActions,
        expect.any(Function),
        expect.anything()
      )
    })

    test('should handle empty plannedActions array', async () => {
      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      mockGetActionsForParcel.mockImplementation((parcel, payload) => {
        const result = {
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id
        }

        if (payload.fields.includes('size')) {
          result.size = {
            unit: 'ha',
            value: 10
          }
        }

        if (payload.fields.some((f) => f.startsWith('actions'))) {
          result.actions = mockActionsWithAvailableArea
        }

        return Promise.resolve(result)
      })

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
      mockGetActionsForParcel.mockImplementation((parcel, payload) => {
        const result = {
          parcelId: parcel.parcel_id,
          sheetId: parcel.sheet_id
        }

        if (payload.fields.includes('size')) {
          result.size = {
            unit: 'ha',
            value: 10
          }
        }

        if (payload.fields.some((f) => f.startsWith('actions'))) {
          result.actions = mockActionsWithAvailableArea
        }

        return Promise.resolve(result)
      })

      const request = {
        method: 'POST',
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
        url: '/api/v2/parcels',
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
