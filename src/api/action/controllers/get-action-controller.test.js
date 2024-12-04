import Hapi from '@hapi/hapi'
import { action } from '../index.js'
import { actions as mockActions } from '~/src/helpers/seed-db/data/actions.js'

jest.mock('../helpers/find-action.js', () => ({
  findAction: jest.fn(() => Promise.resolve(mockActions[0]))
}))

describe('Get Actions controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([action])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  test('GET /action route should return 404 when actionCode parameter is missing', async () => {
    const request = {
      method: 'GET',
      url: '/action'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(404)
  })

  // TODO tests with preexisting actions for GET and POST

  test('GET /action route should return 200 when actionCode parameter is provided', async () => {
    const request = {
      method: 'GET',
      url: '/action/SAM1'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      action: {
        code: 'SAM1',
        description:
          'Assess soil, test soil organic matter and produce a soil management plan',
        payment: {
          amountPerHectare: 5.8,
          additionalPaymentPerAgreement: 95
        },
        eligibilityRules: [
          { id: 'is-below-moorland-line' },
          { id: 'is-for-whole-parcel-area' }
        ]
      }
    })
  })
})
