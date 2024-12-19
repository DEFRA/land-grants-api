import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'

import actionsModel from '~/src/models/actions.js'
import { action } from '~/src/api/action/index.js'
import { actions as actionsMockData } from '~/src/helpers/seed-db/data/actions.js'

const actionsFindOne = (query) => {
  const actionCode = query.getQuery().code
  return actionsMockData.find((action) => action.code === actionCode)
}

describe('Get Actions controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    await server.register([action])
    await server.initialize()

    mockingoose(actionsModel).toReturn(actionsFindOne, 'findOne')
  })

  afterAll(async () => {
    await server.stop()
    mockingoose(actionsModel).reset()
  })

  test('GET /action route should return 404 when actionCode parameter is missing', async () => {
    const request = {
      method: 'GET',
      url: '/action'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(404)
  })

  test('GET /action route should return 200 when actionCode parameter is provided', async () => {
    const request = {
      method: 'GET',
      url: '/action/SAM1'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    expect(response.result.action.code).toBe('SAM1')
  })
})
