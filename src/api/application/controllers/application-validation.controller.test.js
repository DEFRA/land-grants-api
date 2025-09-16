import Hapi from '@hapi/hapi'
import { application } from '../index.js'
import { validateLandParcelActions } from '~/src/api/actions/service/land-parcel-validation.service.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import { applicationTransformer } from '../transformers/application.transformer.js'

jest.mock('~/src/api/actions/service/land-parcel-validation.service.js')
jest.mock('~/src/api/application/mutations/saveApplication.mutation.js')
jest.mock('~/src/api/application/transformers/application.transformer.js')

const mockApplicationTransformed = {
  date: expect.any(Date),
  requester: 'grants-ui',
  hasPassed: true,
  landGrantsApiVersion: '0.0.0',
  application: {
    applicantCrn: '345',
    parcels: [],
    actions: []
  },
  parcelLevelResults: []
}

describe('Application Validation Controller', () => {
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

    await server.register([application])
    await server.initialize()

    validateLandParcelActions.mockResolvedValue([
      {
        code: 'BND1',
        passed: true
      }
    ])
    saveApplication.mockResolvedValue(1)
    applicationTransformer.mockReturnValue(mockApplicationTransformed)
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /application/validate', () => {
    test('should return 400 if payload is not valid', async () => {
      const request = {
        method: 'POST',
        url: '/application/validate',
        payload: {}
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(400)
      expect(result.message).toBe('Invalid request payload input')
    })

    test('should return 500 if no land actions', async () => {
      const request = {
        method: 'POST',
        url: '/application/validate',
        payload: {
          applicationId: '123',
          requester: 'grants-ui',
          applicantCrn: '345',
          landActions: []
        }
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
    })

    test('should return 200 and validate land parcels and actions and save application', async () => {
      const testPayload = {
        applicationId: '123',
        requester: 'grants-ui',
        applicantCrn: '345',
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: 123456789,
            actions: [
              {
                code: 'BND1',
                quantity: 99.0
              }
            ]
          }
        ]
      }
      const request = {
        method: 'POST',
        url: '/application/validate',
        payload: testPayload
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, payload } = await server.inject(request)
      const result = JSON.parse(payload)

      expect(statusCode).toBe(200)
      expect(result.id).toBe(1)
      expect(result.valid).toBe(true)
      expect(result.message).toBe('Application validated successfully')
      expect(validateLandParcelActions).toHaveBeenCalledWith(
        request.payload.landActions[0],
        expect.any(Object)
      )
      expect(saveApplication).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        {
          application_id: '123',
          sbi: 123456789,
          crn: '345',
          data: mockApplicationTransformed
        }
      )
    })
  })
})
