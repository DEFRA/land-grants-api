import Hapi from '@hapi/hapi'
import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { validateWoodlandManagementPlan } from '../service/wmp-service.js'

vi.mock('../service/wmp-service.js')

const mockValidateWoodlandManagementPlan = validateWoodlandManagementPlan

const mockResult = {
  hasPassed: true,
  code: 'PA3',
  actionConfigVersion: '1.0.0',
  rules: [
    {
      name: 'parcel-has-minimum-eligibility-for-woodland-management-plan',
      passed: true,
      description:
        'Is the parcel eligible for the woodland management plan action?',
      reason:
        'The woodland area over 10 years old (1 ha) meets the minimum required area of (0.5 ha)',
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (1 ha)'
          ]
        }
      ]
    }
  ]
}

describe('Validate WMP controller', () => {
  const server = Hapi.server()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })

    await server.register([woodlandManagement])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should return success with validation results', async () => {
    const request = {
      method: 'POST',
      url: '/validate-wmp',
      payload: {
        parcelIds: ['SX067-99238'],
        oldWoodlandArea: 3,
        newWoodlandArea: 1
      }
    }
    mockValidateWoodlandManagementPlan.mockResolvedValue(mockResult)

    /** @type { Hapi.ServerInjectResponse<object> } */
    const {
      statusCode,
      result: { message, result }
    } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(result).toEqual(mockResult)
  })

  test('should handle error', async () => {
    const request = {
      method: 'POST',
      url: '/validate-wmp',
      payload: {
        parcelIds: ['SX067-99238'],
        oldWoodlandArea: 3,
        newWoodlandArea: 1
      }
    }
    mockValidateWoodlandManagementPlan.mockRejectedValue(
      new Error('Something went wrong')
    )

    /** @type { Hapi.ServerInjectResponse<object> } */
    const result = await server.inject(request)

    expect(result.statusCode).toBe(500)
    expect(result.result.message).toBe('An internal server error occurred')
  })
})
