import Hapi from '@hapi/hapi'
import { landactions } from '~/src/api/actions/index.js'
import { validateLandParcelActions } from '../service/land-parcel-validation.service.js'

jest.mock('~/src/api/actions/service/land-parcel-validation.service.js')

describe('Actions validation controller', () => {
  const server = Hapi.server()

  const mockLandActions = {
    landActions: [
      {
        sheetId: 'SX0679',
        parcelId: '9238',
        sbi: 123456789,
        actions: [
          {
            code: 'CMOR1',
            quantity: 99.0
          },
          {
            code: 'UPL1',
            quantity: 200.0
          }
        ]
      }
    ]
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    server.decorate('server', 'postgresDb', {
      connect: jest.fn().mockImplementation(() => ({
        query: jest.fn(),
        release: jest.fn()
      }))
    })

    await server.register([landactions])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /actions/validate route', () => {
    test('should return 200 if the request has a valid parcel payload and valid land parcels', async () => {
      validateLandParcelActions.mockResolvedValue([
        {
          code: 'CMOR1',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: true
        }
      ])

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(true)
      expect(errorMessages).toEqual([])

      expect(validateLandParcelActions).toHaveBeenCalledWith(
        mockLandActions.landActions[0],
        expect.any(Object)
      )
    })

    test('should return 200 with validation errors if rules fail', async () => {
      validateLandParcelActions.mockResolvedValue([
        {
          code: 'CMOR1',
          description: 'Rule 1 failed',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: false
        }
      ])
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(false)
      expect(errorMessages).toEqual([
        {
          code: 'CMOR1',
          description: 'Rule 1 failed',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: false
        }
      ])
    })

    test('should return 404 if land parcel not found', async () => {
      validateLandParcelActions.mockRejectedValue(
        new Error('Land parcel not found: SX0679 9238')
      )

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found: SX0679 9238')
    })

    test('should return 404 if actions not found', async () => {
      validateLandParcelActions.mockRejectedValue(
        new Error('Actions not found')
      )

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 404 if actions is null', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 400 if the request has an invalid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
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
        url: '/actions/validate',
        payload: {
          landActions: []
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

    test('should return 400 if the request has no sbi in payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: {
          landActions: [
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              sbi: '123456789',
              actions: []
            },
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              sbi: '111111111',
              actions: []
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
      expect(message).toBe('All land actions must have the same SBI')
    })

    test('should return 500 if validateLandParcelActions throws an error', async () => {
      validateLandParcelActions.mockRejectedValue(new Error('Database error'))

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should handle multiple land/actions', async () => {
      validateLandParcelActions.mockResolvedValueOnce([
        {
          code: 'BND1',
          description: 'description',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: true
        }
      ])
      validateLandParcelActions.mockResolvedValueOnce([
        {
          code: 'BND2',
          description: 'description',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: false
        }
      ])
      const multiActionPayload = {
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: '123456789',
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
          },
          {
            sheetId: 'SX0677',
            parcelId: '9236',
            sbi: '123456789',
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

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: multiActionPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(false)
      expect(errorMessages).toEqual([
        {
          code: 'BND2',
          description: 'description',
          sheetId: 'SX0679',
          parcelId: '9238',
          passed: false
        }
      ])
    })
  })
})
