import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { landactions } from '~/src/api/actions/index.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { getActions } from '~/src/api/actions/queries/getActions.query.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { applicationTransformer } from '~/src/api/actions/transformers/applicationTransformer.js'

// Mock all the dependencies
jest.mock('~/src/api/parcel/queries/getMoorlandInterceptPercentage.js')
jest.mock('~/src/rules-engine/rulesEngine.js')
jest.mock('~/src/api/actions/queries/getActions.query.js')
jest.mock('~/src/rules-engine/rules/index.js')
jest.mock('~/src/api/actions/transformers/applicationTransformer.js')

describe('Actions validation controller', () => {
  const server = Hapi.server()
  const mockActionData = {
    code: 'BND1',
    rules: ['rule1', 'rule2']
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    })

    server.decorate('server', 'postgresDb', {
      connect: jest.fn().mockImplementation(() => ({
        query: jest.fn(),
        release: jest.fn()
      }))
    })

    await server.register([landactions])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock implementations
    getMoorlandInterceptPercentage.mockResolvedValue(50)
    applicationTransformer.mockReturnValue({
      areaAppliedFor: 50,
      actionCodeAppliedFor: 'BND1',
      landParcel: {
        area: 99,
        intersections: { moorland: { intersectingAreaPercentage: 50 } }
      }
    })
    getActions.mockResolvedValue([mockActionData])
    executeRules.mockReturnValue({
      passed: true,
      results: []
    })
  })

  describe('POST /actions/validate route', () => {
    test('should return 200 if the request has a valid parcel payload and rules pass', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      executeRules.mockReturnValue({
        passed: true,
        results: []
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(true)
      expect(getMoorlandInterceptPercentage).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        expect.any(Object),
        expect.any(Object)
      )
      expect(getActions).toHaveBeenCalled()
      expect(applicationTransformer).toHaveBeenCalledWith(
        50, // This is hardcoded in the controller for now
        'BND1',
        99,
        50
      )
      expect(executeRules).toHaveBeenCalledWith(
        rules,
        expect.any(Object),
        mockActionData.rules
      )
    })

    test('should return 200 with validation errors if rules fail', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      const failedResults = [
        { name: 'rule1', passed: false, message: 'Rule 1 failed' },
        { name: 'rule2', passed: true }
      ]

      executeRules.mockReturnValue({
        passed: false,
        results: failedResults
      })

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, valid, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(false)
      expect(errorMessages).toEqual([
        { code: 'rule1', description: 'Rule 1 failed' }
      ])
    })

    test('should return 400 if the request has an invalid parcel payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: {
          landActions: null
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

    test('should return 500 if the request has no land actions in payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: {
          landActions: []
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

    test('should return 500 if getMoorlandInterceptPercentage throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getMoorlandInterceptPercentage.mockRejectedValue(
        new Error('Database error')
      )

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 if getActions throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getActions.mockRejectedValue(new Error('Failed to retrieve actions'))

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
