import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { createServer } from '~/src/api/index.js'

describe('#landParcelController', () => {
  /** @type {Server} */
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe.skip('With results', () => {
    beforeEach(async () => {
      await server.db
        .collection('example-data')
        .insertOne({ exampleId: 'one', exampleData: 'data' })
    })

    afterEach(async () => {
      await server.db.collection('example-data').deleteMany({})
    })

    test('Should provide expected response', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/example/one'
      })

      expect(result).toEqual({
        entity: {
          exampleData: 'data',
          exampleId: 'one'
        },
        message: 'success'
      })
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  test('Should provide expected 404 response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/example/one'
    })

    expect(result).toEqual({
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404
    })
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

/**
 * @import { Server } from '@hapi/hapi'
 */
