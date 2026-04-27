import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { validateWoodlandManagementPlan } from '../service/wmp-service.js'
import { getAndValidateParcels } from '../../parcel/validation/2.0.0/parcel.validation.js'
import createTestServer from '~/src/tests/test-server.js'

vi.mock('../service/wmp-service.js')
vi.mock('../../parcel/validation/2.0.0/parcel.validation.js')

const mockValidateWoodlandManagementPlan = validateWoodlandManagementPlan
const mockGetAndValidateParcels = getAndValidateParcels

const mockRuleResult = [
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

const mockValidateResult = {
  action: {
    code: 'PA3',
    rules: ['ruleA'],
    semanticVersion: '1.0.0'
  },
  ruleResult: { results: mockRuleResult, passed: true }
}

const mockTransformedResult = {
  hasPassed: true,
  code: 'PA3',
  actionConfigVersion: '1.0.0',
  rules: mockRuleResult
}

const mockParcelValidationResult = {
  parcels: [{ area_sqm: 10000 }, { area_sqm: 5000 }],
  errors: null
}

describe('Validate WMP controller', () => {
  const server = createTestServer()

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
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        oldWoodlandAreaHa: 3,
        newWoodlandAreaHa: 1
      }
    }
    mockValidateWoodlandManagementPlan.mockResolvedValue(mockValidateResult)
    mockGetAndValidateParcels.mockResolvedValue(mockParcelValidationResult)

    /** @type { Hapi.ServerInjectResponse<object> } */
    const {
      statusCode,
      result: { message, result }
    } = await server.inject(request)

    expect(statusCode).toBe(200)
    expect(message).toBe('success')
    expect(result).toEqual(mockTransformedResult)
  })

  test('should handle error', async () => {
    const request = {
      method: 'POST',
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        oldWoodlandAreaHa: 3,
        newWoodlandAreaHa: 1
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

  test('should return not found when a parcel is not found', async () => {
    const request = {
      method: 'POST',
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        oldWoodlandAreaHa: 3,
        newWoodlandAreaHa: 1
      }
    }
    mockGetAndValidateParcels.mockResolvedValue({
      parcels: [],
      errors: ['Land parcels not found: SX067-99238']
    })

    /** @type { Hapi.ServerInjectResponse<object> } */
    const result = await server.inject(request)

    expect(result.statusCode).toBe(404)
    expect(result.result.message).toBe('Land parcels not found: SX067-99238')
  })

  test('should return bad request when no oldWoodlandAreaHa', async () => {
    const request = {
      method: 'POST',
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        newWoodlandAreaHa: 1
      }
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const result = await server.inject(request)

    expect(result.statusCode).toBe(400)
    expect(result.result.message).toBe('"oldWoodlandAreaHa" is required')
  })

  test('should return bad request when oldWoodlandAreaHa is negative', async () => {
    const request = {
      method: 'POST',
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        newWoodlandAreaHa: 1,
        oldWoodlandAreaHa: -1
      }
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const result = await server.inject(request)

    expect(result.statusCode).toBe(400)
    expect(result.result.message).toBe(
      '"oldWoodlandAreaHa" must be greater than or equal to 0'
    )
  })

  test('should return bad request when newWoodlandAreaHa is negative', async () => {
    const request = {
      method: 'POST',
      url: '/api/v1/wmp/validate',
      payload: {
        parcelIds: ['SX067-99238'],
        newWoodlandAreaHa: -1,
        oldWoodlandAreaHa: 1
      }
    }

    /** @type { Hapi.ServerInjectResponse<object> } */
    const result = await server.inject(request)

    expect(result.statusCode).toBe(400)
    expect(result.result.message).toBe(
      '"newWoodlandAreaHa" must be greater than or equal to 0'
    )
  })
})
