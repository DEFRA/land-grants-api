import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'

import { parcel } from '~/src/api/parcel/index.js'
import parcelModel from '~/src/api/parcel/models/parcel.model.js'
import { getActions } from '~/src/api/parcel/queries/getActions.query.js'
import { mockParcel, mockActions } from '~/src/api/parcel/fixtures/index.js'

jest.mock('~/src/api/parcel/queries/getActions.query.js', () => ({
  getActions: jest.fn()
}))

describe('Parcel controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    await server.register([parcel])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    mockingoose(parcelModel).reset()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /parcel/:parcel route', () => {
    test('should return 400 if the request has an invalid parcel param', async () => {
      const request = {
        method: 'GET',
        url: '/parcel/1'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request params input')
    })

    test('should return 404 if the parcel does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(parcelModel).toReturn(null, 'findOne')

      const request = {
        method: 'GET',
        url: `/parcel/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found')
    })

    test('should return 404 if the parcel does not have any actions', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      getActions.mockReturnValueOnce(null)

      mockingoose(parcelModel).toReturn(mockParcel, 'findOne')

      const request = {
        method: 'GET',
        url: `/parcel/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 500 if the controller throws an error', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      getActions.mockImplementationOnce(() => {
        throw new Error('An internal server error occurred')
      })

      mockingoose(parcelModel).toReturn(mockParcel, 'findOne')

      const request = {
        method: 'GET',
        url: `/parcel/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })
  })

  test('should return 200 if valid land parcel and actions', async () => {
    const sheetId = 'SX0679'
    const parcelId = '9238'

    getActions.mockReturnValueOnce(mockActions)

    mockingoose(parcelModel).toReturn(mockParcel, 'findOne')

    const request = {
      method: 'GET',
      url: `/parcel/${sheetId}-${parcelId}`
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const {
      statusCode,
      result: { message, parcel }
    } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(parcel).toBeDefined()
    expect(parcel.parcelId).toBe(parcelId)
    expect(parcel.sheetId).toBe(sheetId)
    expect(parcel.size.unit).toBe('ha')
    expect(parcel.size.value).toBe(440)
    expect(parcel.actions).toBeDefined()
    expect(parcel.actions).toHaveLength(1)
  })
})
