import Hapi from '@hapi/hapi'
import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
import { landactions } from '~/src/api/actions/index.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '../../agreements/transformers/agreements.transformer.js'

jest.mock('~/src/api/parcel/queries/getMoorlandInterceptPercentage.js')
jest.mock('~/src/rules-engine/rulesEngine.js')
jest.mock('~/src/api/actions/queries/getActions.query.js')
jest.mock('~/src/api/parcel/queries/getLandData.query.js')
jest.mock('~/src/rules-engine/rules/index.js')
jest.mock('~/src/api/actions/transformers/application.transformer.js')
jest.mock('../../agreements/queries/getAgreementsForParcel.query.js')
jest.mock('../../agreements/transformers/agreements.transformer.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')
jest.mock('~/src/available-area/availableArea.js')

const mockGetLandData = getLandData
const mockGetMoorlandInterceptPercentage = getMoorlandInterceptPercentage
const mockGetEnabledActions = getEnabledActions
const mockApplicationTransformer = applicationTransformer
const mockExecuteRules = executeRules
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockMergeAgreementsTransformer = mergeAgreementsTransformer
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockGetAvailableAreaForAction = getAvailableAreaForAction

describe('Actions validation controller', () => {
  const server = Hapi.server()

  const mockActionData = {
    code: 'BND1',
    rules: ['rule1', 'rule2'],
    landCoverClassCodes: ['130', '240']
  }

  const mockLandParcelData = {
    parcel_id: '9238',
    sheet_id: 'SX0679',
    area_sqm: 10000
  }

  const mockCompatibilityCheckFn = jest.fn()
  const mockAvailableAreaResult = {
    availableAreaSqm: 1000,
    totalValidLandCoverSqm: 1000
  }

  const mockAacDataRequirements = {
    landCoverCodesForAppliedForAction: [],
    landCoversForParcel: [],
    landCoversForExistingActions: []
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

    mockGetLandData.mockResolvedValue(mockLandParcelData)
    mockGetMoorlandInterceptPercentage.mockResolvedValue(50)
    mockApplicationTransformer.mockReturnValue({
      areaAppliedFor: 99,
      actionCodeAppliedFor: 'BND1',
      landParcel: {
        area: 99,
        intersections: { moorland: { intersectingAreaPercentage: 50 } }
      }
    })
    mockGetEnabledActions.mockResolvedValue([mockActionData])
    mockExecuteRules.mockReturnValue({
      passed: true,
      results: []
    })
    mockGetAgreementsForParcel.mockResolvedValue([])
    mockMergeAgreementsTransformer.mockReturnValue([])
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockGetAvailableAreaDataRequirements.mockResolvedValue(
      mockAacDataRequirements
    )
    mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
  })

  describe('POST /actions/validate route', () => {
    test('should return 200 if the request has a valid parcel payload and rules pass', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      mockExecuteRules.mockReturnValue({
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

      expect(mockApplicationTransformer).toHaveBeenCalledWith(
        99.0,
        'BND1',
        0.1, // sqmToHaRounded(1000)
        50,
        []
      )
      expect(mockExecuteRules).toHaveBeenCalledWith(
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

      mockExecuteRules.mockReturnValue({
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
        {
          code: 'BND1',
          description: 'Rule 1 failed',
          sheetId: 'SX0679',
          parcelId: '9238'
        },
        {
          code: 'BND2',
          description: 'Rule 1 failed',
          sheetId: 'SX0679',
          parcelId: '9238'
        }
      ])
    })

    test('should return 404 if land parcel not found', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      mockGetLandData.mockResolvedValue(null)

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found: SX0679 9238')
    })

    test('should return 404 if no actions found', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      mockGetEnabledActions.mockResolvedValue([])

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
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

    test('should return 400 if the request has no land actions in payload', async () => {
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

      expect(statusCode).toBe(400)
      expect(message).toBe('Invalid request payload input')
    })

    test('should return 400 if the request has no sbi in payload', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: {
          landActions: [
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              sbi: '123456789',
              actions: []
            },
            {
              sheetId: 'SX0679',
              parcelId: '9238',
              sbi: '111111111',
              actions: []
            }
          ]
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(400)
      expect(message).toBe('All land actions must have the same SBI')
    })

    test('should return 500 if getLandData throws an error', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      mockGetLandData.mockRejectedValue(new Error('Database error'))

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

      mockGetMoorlandInterceptPercentage.mockRejectedValue(
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

      mockGetEnabledActions.mockRejectedValue(
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

    test('should return 500 if available area calculation fails', async () => {
      const request = {
        method: 'POST',
        url: '/actions/validate',
        payload: mockLandActions
      }

      mockGetAvailableAreaDataRequirements.mockRejectedValue(
        new Error('Area calculation failed')
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

      mockGetEnabledActions.mockResolvedValue([mockActionData, mockActionData2])

      mockExecuteRules
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
        {
          code: 'BND2',
          description: 'Rule failed for BND2',
          sheetId: 'SX0679',
          parcelId: '9238'
        }
      ])
    })

    test('should handle multiple land/actions', async () => {
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
          },
          {
            sheetId: 'SX0677',
            parcelId: '9236',
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

      mockGetEnabledActions.mockResolvedValue([mockActionData, mockActionData2])

      mockExecuteRules
        .mockReturnValueOnce({
          passed: true,
          results: [{ passed: true, message: 'Rule passed' }]
        })
        .mockReturnValueOnce({
          passed: false,
          results: [{ passed: false, message: 'Rule failed for BND2' }]
        })
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
        {
          code: 'BND2',
          description: 'Rule failed for BND2',
          sheetId: 'SX0679',
          parcelId: '9238'
        },
        {
          code: 'BND2',
          description: 'Rule failed for BND2',
          sheetId: 'SX0677',
          parcelId: '9236'
        }
      ])
    })
  })
})
