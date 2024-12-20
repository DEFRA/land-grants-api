import Hapi from '@hapi/hapi'
import * as mockingoose from 'mockingoose'

import actionsModel from '~/src/models/actions.js'
import { actions as actionsMockData } from '~/src/helpers/seed-db/data/actions.js'
import { action } from '../index.js'

const actionsFind = () => actionsMockData
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
    mockingoose(actionsModel).toReturn(actionsFind, 'find')
  })

  afterAll(async () => {
    await server.stop()
    mockingoose(actionsModel).reset()
  })

  test('GET /actions route should return 400 when parcel-id query parameter is missing', async () => {
    const request = {
      method: 'GET',
      url: '/actions'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(400)
  })

  test('GET /actions route should return 200 when parcel-id query parameter is provided', async () => {
    const request = {
      method: 'GET',
      url: '/actions?parcel-id=123&land-use-codes=AC32'
    }
    const response = await server.inject(request)
    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual([
      {
        code: 'SAM1',
        description:
          'Assess soil, test soil organic matter and produce a soil management plan',
        payment: { amountPerHectare: 5.8, additionalPaymentPerAgreement: 95 }
      },
      {
        code: 'SAM2',
        description: 'Multi-species winter cover crop',
        payment: { amountPerHectare: 129 }
      },
      {
        code: 'AB3',
        description: 'Beetle banks',
        payment: { amountPerHectare: 573 }
      },
      {
        code: 'GRH7',
        description: 'Haymaking supplement',
        payment: {
          amountPerHectare: 157
        }
      },
      {
        code: 'CSAM1',
        description:
          'Assess soil, produce a soil management plan and test soil organic matter',
        payment: { amountPerHectare: 6, additionalPaymentPerAgreement: 97 }
      },
      {
        code: 'CSAM2',
        description: 'Multi-species winter cover crop',
        payment: { amountPerHectare: 129 }
      },
      {
        code: 'CSAM3',
        description: 'Herbal leys',
        payment: { amountPerHectare: 382 }
      },
      {
        code: 'CLIG3',
        description: 'Manage grassland with very low nutrient inputs',
        payment: {
          amountPerHectare: 151
        }
      }
    ])
  })
})
