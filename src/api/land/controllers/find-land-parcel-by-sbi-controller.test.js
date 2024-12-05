import Hapi from '@hapi/hapi'
import { land } from '../index.js'
import { farmers as mockFarmers } from '~/src/helpers/seed-db/data/farmers.js'
import CatboxMemory from '@hapi/catbox-memory'

jest.mock('../../../services/arcgis')

jest.mock('../helpers/find-land-parcel-by-sbi.js', () => ({
  findLandParcelsBySbi: jest.fn((db, sbi) => {
    const results = mockFarmers.find((farmer) =>
      farmer.businesses.filter((business) => business.sbi === sbi)
    )

    if (!results) return Promise.reject(new Error('No matching businesses'))

    const business = [results][0].businesses.filter(
      (business) => business.sbi === sbi
    )

    // Get the parcels
    const parcels = business[0].parcels.map((parcel) => ({
      id: parcel.id,
      sheetId: parcel.sheetId,
      agreements: parcel.agreements,
      attributes: parcel.attributes
    }))

    return Promise.resolve(parcels)
  })
}))

jest.mock('../helpers/find-land-cover-code.js', () => ({
  findLandCoverCode: jest.fn((db, code) => {
    const responses = {
      131: {
        name: 'Permanent grassland',
        code: '131',
        uses: [
          {
            name: 'Permanent grassland',
            code: 'PG01'
          }
        ]
      },
      118: {
        name: 'Other arable crops',
        code: '118',
        uses: [
          {
            name: 'Wheat - spring',
            code: 'AC32'
          }
        ]
      },
      583: {
        name: 'Rivers and Streams type 3',
        code: '583',
        uses: [
          {
            name: 'Rivers and Streams type 3',
            code: 'IW03'
          }
        ]
      }
    }
    return Promise.resolve(responses[code])
  })
}))

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
  })

  afterAll(async () => {
    await server.stop()
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
          attributes: {
            moorlandLineStatus: 'below'
          },
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
