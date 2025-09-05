import Hapi from '@hapi/hapi'

import { landactions } from '~/src/api/actions/index.js'
import { getEnabledActions } from '../queries/getActions.query.js'

jest.mock('~/src/api/actions/queries/getActions.query.js')

const mockAction = {
  id: 1,
  code: 'CMOR1',
  description: 'CMOR1: Assess moorland and produce a written record',
  enabled: true,
  display: true,
  version: '1',
  startDate: '2025-01-01',
  applicationUnitOfMeasurement: 'ha',
  durationYears: 3,
  lastUpdated: '2025-01-01',
  payment: {
    ratePerUnitGbp: 10.6,
    ratePerAgreementPerYearGbp: 272
  },
  landCoverClassCodes: [
    '130',
    '240',
    '250',
    '270',
    '280',
    '300',
    '330',
    '580',
    '590',
    '620',
    '640',
    '650'
  ],
  rules: [
    {
      name: 'parcel-has-intersection-with-data-layer',
      config: {
        layerName: 'moorland',
        minimumIntersectionPercent: 50,
        tolerancePercent: 1
      }
    }
  ]
}

const mockHiddenAction = {
  id: 1,
  code: 'SPM4',
  description:
    'SPM4: Keep native breeds on extensively managed habitats supplement (50-80%)',
  enabled: true,
  display: false,
  version: '1',
  startDate: '2025-01-01',
  applicationUnitOfMeasurement: 'ha',
  durationYears: 3,
  lastUpdated: '2025-01-01',
  payment: {
    ratePerUnitGbp: 7
  },
  landCoverClassCodes: [],
  rules: []
}

describe('Actions controller', () => {
  const server = Hapi.server()

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
  })

  describe('GET /actions route', () => {
    test('should return 200', async () => {
      getEnabledActions.mockResolvedValue([])

      const request = {
        method: 'GET',
        url: '/actions'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, errorMessages }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')
      expect(errorMessages).toBeUndefined()
    })

    test('should return error if actions call fails', async () => {
      getEnabledActions.mockRejectedValue(
        new Error('Failed to retrieve actions')
      )

      const request = {
        method: 'GET',
        url: '/actions'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message }
      } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(message).toBe('An internal server error occurred')
    })

    test('should return actions', async () => {
      getEnabledActions.mockResolvedValue([mockAction, mockHiddenAction])

      const request = {
        method: 'GET',
        url: '/actions'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const {
        statusCode,
        result: { message, actions }
      } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(message).toBe('success')

      expect(actions).toEqual([mockAction])
    })
  })
})
