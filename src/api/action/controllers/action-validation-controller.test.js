import Hapi from '@hapi/hapi'
import { action } from '../index.js'
import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

jest.mock('../helpers/find-action.js', () => ({
  findAction: jest.fn(() => Promise.resolve(mockActions[0]))
}))

describe('Action Validation controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([action])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('POST /action-validation route', () => {
    test('should return 400 if theres no payload', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('"value" must be of type object')
    })

    test('should return 400 with the correct message if no actions are supplied', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {}
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('"actions" is required')
    })

    test('should return 400 with the correct message if no land parcels are supplied', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM3',
              quantity: '5.2721',
              description: 'Herbal leys'
            }
          ]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        result: { statusCode, message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('"landParcel" is required')
    })

    test('should return 200 with the correct message if theres a valid combination', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM1',
              quantity: '5.2721',
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            parcelId: '5351',
            area: '5.2721',
            osSheetId: 'SK1715',
            moorlandLineStatus: 'below',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message: 'Action combination valid',
          isValidCombination: true
        })
      )
    })

    test('should return 200 with the correct message if the area applied for is too large', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM1',
              quantity: '6.2721',
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            parcelId: '5351',
            area: '5.2721',
            osSheetId: 'SK1715',
            moorlandLineStatus: 'below',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message:
            'CSAM1: Area applied for (6.2721ha) does not match parcel area (5.2721ha)',
          isValidCombination: false
        })
      )
    })

    test('should return 200 with the correct message if the combination is invalid', async () => {
      // TODO - Need to find a combination of codes that are invalid
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM15', // why does this made up code work??
              quantity: '5.2721',
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            parcelId: '5351',
            area: '5.2721',
            osSheetId: 'SK1715',
            moorlandLineStatus: 'below',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message: 'Action combination valid',
          isValidCombination: true
        })
      )
    })

    test('should return 200 with the correct message if the combination is valid', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM1',
              quantity: '5.2721',
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            parcelId: '5351',
            area: '5.2721',
            osSheetId: 'SK1715',
            moorlandLineStatus: 'below',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message: 'Action combination valid',
          isValidCombination: true
        })
      )
    })
  })
})
