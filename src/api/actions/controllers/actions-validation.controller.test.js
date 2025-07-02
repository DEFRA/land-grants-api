import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { landactions } from '~/src/api/actions/index.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'
import { getLandCoversForAction } from '~/src/api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getParcelAvailableArea } from '~/src/api/parcel/queries/getParcelAvailableArea.query.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'

jest.mock('~/src/api/parcel/queries/getMoorlandInterceptPercentage.js')
jest.mock('~/src/rules-engine/rulesEngine.js')
jest.mock('~/src/api/actions/queries/getActions.query.js')
jest.mock('~/src/api/parcel/queries/getParcelAvailableArea.query.js')
jest.mock('~/src/api/parcel/queries/getLandData.query.js')
jest.mock('~/src/rules-engine/rules/index.js')
jest.mock('~/src/api/actions/transformers/application.transformer.js')
jest.mock('~/src/api/land-cover-codes/queries/getLandCoversForAction.query.js')

describe('Actions validation controller', () => {
  const server = Hapi.server()
  const mockActionData = {
    code: 'BND1',
    rules: ['rule1', 'rule2'],
    landCoverClassCodes: ['130', '240']
  }

  const mockLandCoverCodes = [
    { landCoverClassCode: '130', landCoverCode: '131' },
    { landCoverClassCode: '240', landCoverCode: '241' },
    { landCoverClassCode: '240', landCoverCode: '244' }
  ]
  const mockLandParcelData = [
    {
      sheet_id: 'SX0679',
      parcel_id: '9238',
      area: 1000
    }
  ]

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

    getLandData.mockResolvedValue(mockLandParcelData)
    getMoorlandInterceptPercentage.mockResolvedValue(50)
    getParcelAvailableArea.mockResolvedValue(1000)
    applicationTransformer.mockReturnValue({
      areaAppliedFor: 99,
      actionCodeAppliedFor: 'BND1',
      landParcel: {
        area: 99,
        intersections: { moorland: { intersectingAreaPercentage: 50 } }
      }
    })
    getEnabledActions.mockResolvedValue([mockActionData])
    getLandCoversForAction.mockResolvedValue(mockLandCoverCodes)
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
        result: { message, valid, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(valid).toBe(true)
      expect(errorMessages).toEqual([])

      expect(getLandData).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        expect.any(Object),
        expect.any(Object)
      )
      expect(getEnabledActions).toHaveBeenCalledWith(expect.any(Object))
      expect(getLandCoversForAction).toHaveBeenCalledWith(
        mockActionData.code,
        expect.any(Object)
      )
      expect(getMoorlandInterceptPercentage).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        expect.any(Object),
        expect.any(Object)
      )
      expect(getParcelAvailableArea).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        mockLandCoverCodes,
        expect.any(Object),
        expect.any(Object)
      )
      expect(applicationTransformer).toHaveBeenCalledWith(
        99.0,
        'BND1',
        1000,
        50,
        []
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
        { name: 'rule2', passed: true, message: 'Rule 2 passed' }
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
        { code: 'BND1', description: 'Rule 1 failed' },
        { code: 'BND2', description: 'Rule 1 failed' }
      ])
    })

    test('should return 404 if land parcel not found', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getLandData.mockResolvedValue(null)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found')
    })

    test('should return 404 if no actions found', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getEnabledActions.mockResolvedValue([])

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 404 if no rules found for action', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getEnabledActions.mockResolvedValue([
        {
          code: 'BND1',
          rules: [],
          landCoverClassCodes: ['130', '240']
        }
      ])

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe(
        'Error validating land actions, no rules found for action'
      )
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

    test('should return 500 if getLandData throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getLandData.mockRejectedValue(new Error('Database error'))

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

      getEnabledActions.mockRejectedValue(
        new Error('Failed to retrieve actions')
      )

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return 500 if getParcelAvailableArea throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      getParcelAvailableArea.mockRejectedValue(
        new Error('Failed to calculate parcel area')
      )

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should handle multiple actions and aggregate results', async () => {
      const multiActionPayload = {
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: '123456789',
            actions: [
              {
                code: 'BND1',
                quantity: 99.0
              },
              {
                code: 'BND2',
                quantity: 200.0
              }
            ]
          }
        ]
      }

      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: multiActionPayload
      }

      const mockActionData2 = {
        code: 'BND2',
        rules: ['rule3', 'rule4'],
        landCoverClassCodes: ['130', '240']
      }

      getEnabledActions.mockResolvedValue([mockActionData, mockActionData2])

      executeRules
        .mockReturnValueOnce({
          passed: true,
          results: [{ passed: true, message: 'Rule passed' }]
        })
        .mockReturnValueOnce({
          passed: false,
          results: [{ passed: false, message: 'Rule failed for BND2' }]
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
        { code: 'BND2', description: 'Rule failed for BND2' }
      ])

      expect(applicationTransformer).toHaveBeenCalledTimes(2)
      expect(applicationTransformer).toHaveBeenNthCalledWith(
        1,
        99.0,
        'BND1',
        1000,
        50,
        []
      )
      expect(applicationTransformer).toHaveBeenNthCalledWith(
        2,
        200.0,
        'BND2',
        1000,
        50,
        []
      )
    })
  })
})
