import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'
import { parcel } from '~/src/api/parcel/index.js'
import actionModel from '~/src/api/actions/models/action.model.js'
import { mockActions } from '~/src/api/actions/fixtures/index.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'
import { getParcelAvailableArea } from '../../parcel/queries/getParcelAvailableArea.query.js'
import { getLandCoversForAction } from '../../land-cover-codes/queries/getLandCoversForAction.query.js'
import { mockLandCoverCodes } from '../../land-cover-codes/fixtures/index.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'

jest.mock('../../parcel/queries/getLandData.query.js')
jest.mock('../../parcel/queries/getParcelAvailableArea.query.js')
jest.mock('../../land-cover-codes/queries/getLandCoversForAction.query.js')

const mockGetLandData = getLandData
const mockGetParcelAvailableArea = getParcelAvailableArea
const mockGetLandCoversForAction = getLandCoversForAction

describe('Parcels controller', () => {
  const server = Hapi.server()

  const mockLandParcelData = [
    {
      parcel_id: '9238',
      sheet_id: 'SX0679',
      area_sqm: 440,
      geom: 'POLYGON((...))',
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

    mockGetLandData.mockResolvedValue(mockLandParcelData)
    mockGetParcelAvailableArea.mockResolvedValue(sqmToHaRounded(300))
    mockGetLandCoversForAction.mockResolvedValue(mockLandCoverCodes)
  })

  const expectedOutput = [
    {
      parcelId: '9238',
      sheetId: 'SX0679',
      size: {
        unit: 'ha',
        value: 0.044
      },
      actions: [
        {
          code: 'CMOR1',
          description: 'CMOR1: Assess moorland and produce a written record',
          availableArea: {
            unit: 'ha',
            value: 0.03
          }
        }
      ]
    }
  ]

  describe('POST /parcels route', () => {
    test('should return 200 if all fields are requested', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['size', 'actions', 'actions.availableArea'],
          parcelIds: ['SX0679-9238']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual(expectedOutput)

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

    test('should return 200 if fields: `size` passed in the request', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['size'],
          parcelIds: ['SX0679-9238']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      const expectedOutputWithSizeOnly = [
        {
          ...expectedOutput[0],
          actions: undefined
        }
      ]

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual(expectedOutputWithSizeOnly)

      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
      expect(mockGetParcelAvailableArea).toHaveBeenCalledTimes(0)
    })

    test('should return 200 if fields: `actions` passed in the request', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: ['SX0679-9238']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      const expectedOutputWithActionsOnly = [
        {
          ...expectedOutput[0],
          size: undefined,
          actions: [
            {
              ...expectedOutput[0].actions[0],
              availableArea: undefined
            }
          ]
        }
      ]

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual(expectedOutputWithActionsOnly)

      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
    })

    test('should return 400 if the request has an invalid parcel in payload', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          fields: [],
          parcelIds: ['1']
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

    test('should return 404 if the parcel does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      // Mock getLandData to return null (parcel not found)
      mockGetLandData.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: [],
          parcelIds: [`${sheetId}-${parcelId}`]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found: SX0679-9238')
    })

    test('should return 404 if the actions does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      // Mock actions to return null
      mockingoose(actionModel).toReturn(null, 'find')

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: [`${sheetId}-${parcelId}`]
        }
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
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: [`${sheetId}-${parcelId}`]
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

    test('should return 500 if available area calculation fails', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockingoose(actionModel).toReturn(mockActions, 'find')

      mockGetParcelAvailableArea.mockRejectedValue(
        new Error('Area calculation failed')
      )

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions.availableArea'],
          parcelIds: [`${sheetId}-${parcelId}`]
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
  })
})
