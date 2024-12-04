import Hapi from '@hapi/hapi'
import { paymentCalculation } from '../index.js'
import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

jest.mock('../../action/helpers/find-action.js', () => ({
  findAction: jest.fn((db, actionCode) =>
    Promise.resolve(mockActions.find((item) => item.code === actionCode))
  )
}))

describe('paymentCalculationController', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([paymentCalculation])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('POST /payment-calculation', () => {
    test('should return 400 when called with an empty payload', async () => {
      const request = {
        method: 'POST',
        url: '/payment-calculation',
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

    describe('invalid action code', () => {
      const makeRequest = (payload) => ({
        method: 'POST',
        url: '/payment-calculation',
        payload
      })

      test('should return 400 when called with missing action code', async () => {
        const request = makeRequest({
          actions: [{}]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"actions[0].action-code" is required')
      })

      test('should return 400 when called with an invalid action code', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 100
            }
          ]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"actions[0].action-code" must be a string')
      })
    })

    describe('invalid hectares applied for', () => {
      const makeRequest = (payload) => ({
        method: 'POST',
        url: '/payment-calculation',
        payload
      })

      test('should return 400 when called with missing hectares applied for', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 'CSAM1'
            }
          ]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"actions[0].hectares-applied-for" is required')
      })

      test('should return 400 when called with an invalid hectares applied for', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 'CSAM1',
              'hectares-applied-for': 'this is a string'
            }
          ]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe(
          '"actions[0].hectares-applied-for" must be a number'
        )
      })
    })

    describe('invalid land use codes', () => {
      const makeRequest = (payload) => ({
        method: 'POST',
        url: '/payment-calculation',
        payload
      })

      test('should return 400 when called with missing land use codes', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 'CSAM1',
              'hectares-applied-for': 200
            }
          ]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"land-use-codes" is required')
      })

      test('should return 400 when called with invalid land use codes', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 'CSAM1',
              'hectares-applied-for': 200
            }
          ],
          'land-use-codes': '[100]'
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"land-use-codes" must be an array')
      })

      test('should return 400 when called with invalid land use codes array', async () => {
        const request = makeRequest({
          actions: [
            {
              'action-code': 'CSAM1',
              'hectares-applied-for': 200
            }
          ],
          'land-use-codes': [100]
        })

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"land-use-codes[0]" must be a string')
      })
    })

    test('should return the expected object when called with a valid payload', async () => {
      const request = {
        method: 'POST',
        url: '/payment-calculation',
        payload: {
          actions: [
            {
              'action-code': 'CSAM1',
              'hectares-applied-for': 200
            }
          ],
          'land-use-codes': ['AC32']
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)
      expect(result).toStrictEqual([
        {
          'action-code': 'CSAM1',
          payment: 1297
        }
      ])

      expect(statusCode).toBe(200)
    })
  })
})
