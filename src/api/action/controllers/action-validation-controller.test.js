import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'

import actionsModel from '~/src/models/actions.js'
import { actions as actionsMockData } from '~/src/helpers/seed-db/data/actions.js'
import { action } from '../index.js'
import { isValidCombination } from './action-validation-controller.js'

const originalFetch = global.fetch

const actionsFind = (query) => {
  const codes = query.getQuery().$or.map((item) => item.code)
  return actionsMockData.filter((element) => codes.includes(element.code))
}

const actionsFindOne = (query) => {
  const actionCode = query.getQuery().code
  return actionsMockData.find((action) => action.code === actionCode)
}

describe('Action Validation controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([action])
    await server.initialize()

    mockingoose(actionsModel).toReturn(actionsFindOne, 'findOne')
    mockingoose(actionsModel).toReturn(actionsFind, 'find')

    // Mock fetch to provide expected structure
    global.fetch = jest.fn((url = '') => {
      if (typeof url !== 'string') {
        return Promise.reject(new Error('Invalid URL'))
      }

      const response = new Response()
      if (url.indexOf('intersects/moorland') > -1) {
        response.json = () =>
          Promise.resolve({
            entity: {
              nonIntersectingArea: 0.7
            }
          })
      } else if (url.indexOf('intersects/sssi') > -1) {
        response.json = () =>
          Promise.resolve({
            entity: {
              nonIntersectingArea: -0.7
            }
          })
      }
      return Promise.resolve(response)
    })
  })

  afterAll(async () => {
    await server.stop()
    global.fetch = originalFetch
    mockingoose(actionsModel).reset()
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

    test('should return 200 with the correct message if there is a valid combination', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM1',
              quantity: 5.2721,
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            id: '5351',
            area: 5.2721,
            sheetId: 'SK1715',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual(
        JSON.stringify({
          message: ['Action combination valid'],
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
              quantity: 6.2721,
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            id: '5351',
            area: 5.2721,
            sheetId: 'SK1715',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message: [
            'Area applied for (6.2721ha) is greater than parcel area (5.2721ha)'
          ],
          isValidCombination: false
        })
      )
    })

    test('should return 400 with the correct error message if the action code is invalid', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM15',
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

      expect(statusCode).toBe(400)
      expect(result.message).toBe('Unknown action')
    })

    test('should return 200 with the correct message if the combination is valid', async () => {
      const request = {
        method: 'POST',
        url: '/action-validation',
        payload: {
          actions: [
            {
              actionCode: 'CSAM1',
              quantity: 5.2721,
              description: 'Herbal leys'
            }
          ],
          landParcel: {
            id: '5351',
            area: 5.2721,
            sheetId: 'SK1715',
            agreements: [],
            landUseCodes: ['PG01']
          }
        }
      }

      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toBe(
        JSON.stringify({
          message: ['Action combination valid'],
          isValidCombination: true
        })
      )
    })
  })

  describe('is valid combination function', () => {
    it('should return undefined if supplied actions are compatible', async () => {
      const result = await isValidCombination(
        [],
        [{ actionCode: 'CSAM1' }],
        ['PG01']
      )
      expect(result).toStrictEqual([])
    })

    it('should return an error if supplied actions are incompatible', async () => {
      const result = await isValidCombination(
        [],
        [{ actionCode: 'CSAM2' }],
        ['PG01']
      )
      expect(result).toStrictEqual([
        `The selected combination of actions are invalid for land use code: PG01`
      ])
    })
  })
})
