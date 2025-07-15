import Hapi from '@hapi/hapi'
import { mockActions } from '~/src/api/actions/fixtures/index.js'
import { haToSqm } from '~/src/api/common/helpers/measurement.js'
import { parcel } from '~/src/api/parcel/index.js'
import {
  getAvailableAreaForAction,
  getAvailableAreaDataRequirements
} from '~/src/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { getEnabledActions } from '../../actions/queries/index.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { mockLandCoverCodes } from '../../land-cover-codes/fixtures/index.js'
import { getLandCoversForAction } from '../../land-cover-codes/queries/getLandCoversForAction.query.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'
import { logger } from '~/src/db-tests/testLogger.js'

jest.mock('../../parcel/queries/getLandData.query.js')
jest.mock('../../actions/queries/index.js')
jest.mock('~/src/available-area/availableArea.js')
jest.mock('../../land-cover-codes/queries/getLandCoversForAction.query.js')
jest.mock('../../agreements/queries/getAgreementsForParcel.query.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')

const mockGetLandData = getLandData
const mockGetEnabledActions = getEnabledActions
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockGetAvailableAreaForAction = getAvailableAreaForAction
const mockGetLandCoversForAction = getLandCoversForAction
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements

describe('Parcels controller', () => {
  const server = Hapi.server()

  const mockLandParcelData = [
    {
      parcel_id: '9238',
      sheet_id: 'SX0679',
      area_sqm: 440,
      geom: 'POLYGON((...))',
      land_cover_type: 'grassland'
    }
  ]

  const mockCompatibilityCheckFn = jest.fn()
  const mockDataRequirements = { anything: true }
  const mockAvailableAreaResult = {
    stacks: [],
    explanations: [],
    totalValidLandCoverSqm: 300,
    availableAreaSqm: 300,
    availableAreaHectares: 0.03
  }

  beforeAll(async () => {
    server.decorate('request', 'logger', logger)
    server.decorate('server', 'postgresDb', {
      connect: jest.fn(),
      query: jest.fn()
    })
    await server.register([parcel])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetLandData.mockResolvedValue(mockLandParcelData)
    mockGetEnabledActions.mockResolvedValue(mockActions)
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockGetAvailableAreaDataRequirements.mockResolvedValue(mockDataRequirements)
    mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
    mockGetLandCoversForAction.mockResolvedValue(mockLandCoverCodes)
    mockGetAgreementsForParcel.mockResolvedValue([])
  })

  describe('POST /parcels route', () => {
    test('should return 200 if all fields are requested', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['size', 'actions'],
          parcelIds: ['SX0679-9238'],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual([
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          actions: [
            {
              code: 'CMOR1',
              description:
                'CMOR1: Assess moorland and produce a written record',
              availableArea: {
                unit: 'ha',
                value: 0.03
              }
            }
          ],
          size: {
            unit: 'ha',
            value: 0.044
          }
        }
      ])

      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
      expect(mockGetEnabledActions).toHaveBeenCalledWith(expect.any(Object))
      expect(mockGetAvailableAreaForAction).toHaveBeenCalled()
      expect(mockCreateCompatibilityMatrix).toHaveBeenCalled()
    })

    test('should return 200 if fields: `size` passed in the request', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['size'],
          parcelIds: ['SX0679-9238'],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      const expectedOutputWithSizeOnly = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          size: {
            unit: 'ha',
            value: 0.044
          }
        }
      ]

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual(expectedOutputWithSizeOnly)

      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
      expect(mockGetEnabledActions).not.toHaveBeenCalled()
      expect(mockGetAvailableAreaForAction).not.toHaveBeenCalled()
    })

    test('should return 200 if fields: `actions` passed in the request', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: ['SX0679-9238'],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      const expectedOutputWithActionsOnly = [
        {
          parcelId: '9238',
          sheetId: 'SX0679',
          actions: [
            {
              code: 'CMOR1',
              description:
                'CMOR1: Assess moorland and produce a written record',
              availableArea: {
                unit: 'ha',
                value: 0.03
              }
            }
          ]
        }
      ]

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels).toBeDefined()
      expect(parcels).toEqual(expectedOutputWithActionsOnly)

      expect(mockGetLandData).toHaveBeenCalledWith(
        sheetId,
        parcelId,
        expect.any(Object),
        expect.any(Object)
      )
      expect(mockGetEnabledActions).toHaveBeenCalledWith(expect.any(Object))
    })

    test('should return 400 if the request has an invalid parcel in payload', async () => {
      const request = {
        method: 'POST',
        url: '/parcels',
        payload: {
          fields: [],
          parcelIds: ['1'],
          plannedActions: []
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

    test('should return 404 if the parcel does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      // Mock getLandData to return null (parcel not found)
      mockGetLandData.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: [],
          parcelIds: [`${sheetId}-${parcelId}`],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Land parcel not found: SX0679-9238')
    })

    test('should return 404 if the actions does not exist', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      // Mock getEnabledActions to return null/empty
      mockGetEnabledActions.mockResolvedValue(null)

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: [`${sheetId}-${parcelId}`],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(404)
      expect(message).toBe('Actions not found')
    })

    test('should return 500 if the controller throws an error', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockGetEnabledActions.mockRejectedValue(new Error('Database error'))

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: [`${sheetId}-${parcelId}`],
          plannedActions: []
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

    test('should return 500 if available area calculation fails', async () => {
      const sheetId = 'SX0679'
      const parcelId = '9238'

      mockGetAvailableAreaForAction.mockRejectedValue(
        new Error('Area calculation failed')
      )

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions.availableArea'],
          parcelIds: [`${sheetId}-${parcelId}`],
          plannedActions: []
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

    test.only('should include results when actions.results field is requested', async () => {
      const mockAvailableAreaWithResults = {
        ...mockAvailableAreaResult,
        stacks: [{ code: 'CMOR1', quantity: 0.00001 }],
        explanations: ['Test explanation']
      }
      mockGetAvailableAreaForAction.mockResolvedValue(
        mockAvailableAreaWithResults
      )

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions', 'actions.results'],
          parcelIds: ['SX0679-9238'],
          plannedActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, parcels }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(parcels[0].actions[0]).toHaveProperty('results')
      expect(parcels[0].actions[0].results).toEqual({
        totalValidLandCoverSqm: 300,
        stacks: [{ code: 'CMOR1', quantity: 0.00001 }],
        explanations: ['Test explanation']
      })
    })

    test('should handle existing actions in available area calculation', async () => {
      const plannedActions = [
        { actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }
      ]

      const request = {
        method: 'POST',
        url: `/parcels`,
        payload: {
          fields: ['actions'],
          parcelIds: ['SX0679-9238'],
          plannedActions
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(mockGetAvailableAreaForAction).toHaveBeenCalledWith(
        'CMOR1',
        'SX0679',
        '9238',
        mockCompatibilityCheckFn,
        plannedActions.map((a) => ({
          actionCode: a.actionCode,
          areaSqm: haToSqm(a.quantity)
        })),
        expect.any(Object),
        expect.any(Object)
      )
    })
  })
})
