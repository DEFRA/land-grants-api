import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'
import { parcel } from '~/src/api/parcel/index.js'
import actionModel from '~/src/api/actions/models/action.model.js'
import { mockActions } from '~/src/api/actions/fixtures/index.js'
import { getLandData } from '../../land/queries/getLandData.query.js'
import { getParcelAvailableArea } from '../../land/queries/getParcelAvailableArea.query.js'

// Mock the query functions
jest.mock('../../land/queries/getLandData.query.js')
jest.mock('../../land/queries/getParcelAvailableArea.query.js')
jest.mock('~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js')

const mockGetLandData = getLandData
const mockGetParcelAvailableArea = getParcelAvailableArea

describe('Parcel controller', () => {
  const server = Hapi.server()

  const mockLandParcelData = [
    {
      parcel_id: '9238',
      sheet_id: 'SX0679',
      area_sqm: 440, // in hectares (the transformer uses this value directly)
      geom: 'POLYGON((...))', // mock geometry
      land_cover_type: 'grassland'
    }
  ]

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

    // Default mock implementations
    mockGetLandData.mockResolvedValue(mockLandParcelData)
    mockGetParcelAvailableArea.mockResolvedValue(300)
  })

  describe('GET /parcels/:parcel route', () => {
    test('should return 400 if the request has an invalid parcel param', async () => {
      const request = {
        method: 'GET',
        url: '/parcels/1'
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

      // Mock getLandData to return null (parcel not found)
      mockGetLandData.mockResolvedValue(null)

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found')
    })

    test('should return 404 if the actions does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      // Mock actions to return null
      mockingoose(actionModel).toReturn(null, 'find')

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 404 if the parcel does not have any actions', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn([], 'find')

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
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

      mockingoose(actionModel).toReturn(new Error('Database error'), 'find')

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 200 if valid land parcel and actions', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
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
      expect(parcel.size.unit).toBe('sqm')
      expect(parcel.size.value).toBe(440)
      expect(parcel.actions).toBeDefined()
      expect(parcel.actions).toHaveLength(1)

      // Verify that our mocked functions were called
      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
      expect(mockGetParcelAvailableArea).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Array),
        expect.any(Object),
        expect.any(Object)
      )
    })

    test('should return 404 if available area calculation fails', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      // Mock getParcelAvailableArea to throw an error
      mockGetParcelAvailableArea.mockRejectedValue(
        new Error('Area calculation failed')
      )

      const request = {
        method: 'GET',
        url: `/parcels/${sheetId}-${parcelId}`
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
})
