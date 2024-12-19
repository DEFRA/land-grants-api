import Hapi from '@hapi/hapi'
import CatboxMemory from '@hapi/catbox-memory'
import * as mockingoose from 'mockingoose'

import farmersModel from '~/src/models/farmers.js'
import codesModel from '../../../models/codes.js'
import { land } from '../index.js'
import { farmers as farmersMockData } from '~/src/helpers/seed-db/data/farmers.js'
import { codes as codesMockData } from '~/src/helpers/seed-db/data/codes.js'

const farmersFindOne = (query) => {
  const sbiCode = query.getQuery()['businesses.sbi']
  return farmersMockData.find((farmer) =>
    farmer.businesses.filter((business) => business.sbi === sbiCode)
  )
}

const codesFindOne = (query) => {
  const classCode = query.getQuery()['classes.covers.code']
  return codesMockData.find((mockCode) =>
    mockCode.classes.find((mockClass) =>
      mockClass.covers.find((mockCover) => mockCover.code === classCode)
    )
  )
}

jest.mock('../../../services/arcgis')

describe('Land Parcel by SBI controller', () => {
  const server = Hapi.server({
    cache: [
      {
        name: 'frps',
        provider: {
          constructor: CatboxMemory.Engine
        }
      }
    ]
  })

  beforeAll(async () => {
    await server.register([land])
    await server.initialize()

    mockingoose(farmersModel).toReturn(farmersFindOne, 'findOne')
    mockingoose(codesModel).toReturn(codesFindOne, 'findOne')
  })

  afterAll(async () => {
    await server.stop()

    mockingoose(farmersModel).reset()
    mockingoose(codesModel).reset()
  })

  describe('GET /land/parcel/{sbi} route', () => {
    describe('an invalid request', () => {
      test('should return 404 if theres no SBI', async () => {
        const request = {
          method: 'GET',
          url: '/land/parcel'
        }

        /** @type { Hapi.ServerInjectResponse<object> } */
        const { statusCode } = await server.inject(request)

        expect(statusCode).toBe(404)
      })

      test('should return 404 is the SBI isnt a number', async () => {
        const request = {
          method: 'GET',
          url: '/land/parcel/not_a_number'
        }

        /** @type { Hapi.ServerInjectResponse<object> } */
        const {
          statusCode,
          result: { message }
        } = await server.inject(request)

        expect(statusCode).toBe(400)
        expect(message).toBe('"sbi" must be a number')
      })
    })

    describe('a valid request', () => {
      test('should return 200 with a matching business', async () => {
        const request = {
          method: 'GET',
          url: '/land/parcel/908789876'
        }

        /** @type { Hapi.ServerInjectResponse<object> } */
        const { statusCode, result } = await server.inject(request)

        expect(statusCode).toBe(200)
        expect(result).toHaveLength(3)
        expect(result[0]).toStrictEqual({
          id: '6065',
          sbi: 908789876,
          sheetId: 'TR3354',
          agreements: [],
          area: '2.9072',
          centroidX: 633588.383705711,
          centroidY: 154641.049534814,
          validated: 'N',
          features: [
            {
              area: '2.6556',
              landCovers: {
                name: 'Permanent grassland',
                code: '131'
              },
              landUseList: [
                {
                  name: 'Permanent grassland',
                  code: 'PG01'
                }
              ],
              validFrom: 1356998401000,
              validTo: 253402214400000,
              verifiedOn: 1500940800000,
              lastRefreshDate: 1709719063000,
              shapeArea: 67625.3125,
              shapeLength: 1648.4627784300944
            },
            {
              area: '0.2516',
              landCovers: {
                name: 'Rivers and Streams type 3',
                code: '583'
              },
              landUseList: [
                {
                  name: 'Rivers and Streams type 3',
                  code: 'IW03'
                }
              ],
              validFrom: 1356998401000,
              validTo: 253402214400000,
              verifiedOn: 1541116800000,
              lastRefreshDate: 1709719063000,
              shapeArea: 6406.0615234375,
              shapeLength: 338.7092416855114
            }
          ]
        })
      })
    })
  })
})
