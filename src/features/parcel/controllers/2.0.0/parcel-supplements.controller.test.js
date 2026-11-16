import createTestServer from '~/src/tests/test-server.js'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { getDataAndValidateRequest } from '~/src/features/parcel/validation/2.0.0/parcel.validation.js'
import { parcel } from '~/src/features/parcel/index.js'
import { EXCEEDS_BASE_ACTION_AREA } from '~/src/features/parcel/constants/unavailable-reasons.js'

vi.mock(
  '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)
vi.mock('~/src/features/parcel/validation/2.0.0/parcel.validation.js')

const mockGetCompatibilityMatrix = vi.mocked(getCompatibilityMatrix)
const mockGetDataAndValidateRequest = vi.mocked(getDataAndValidateRequest)

const enabledAction = (code) => ({
  code,
  description: `${code} description`,
  semanticVersion: '1.0.0',
  applicationUnitOfMeasurement: 'ha',
  display: true,
  payment: { ratePerUnitGbp: 10 }
})

const row = (optionCode, optionCodeCompat, type) => ({
  id: 1,
  optionCode,
  optionCodeCompat,
  type,
  year: 2026
})

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8 and GRH11, and LIG1 for GRH10
const compatibilityMatrix = [
  row('CLIG3', 'GRH7', 'SUPBAS'),
  row('CLIG3', 'GRH8', 'SUPBAS'),
  row('CLIG3', 'GRH11', 'SUPBAS'),
  row('LIG1', 'GRH10', 'SUPBAS')
]

const enabledActions = ['CLIG3', 'LIG1', 'GRH7', 'GRH8', 'GRH10', 'GRH11'].map(
  enabledAction
)

const baseAction = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

describe('Parcel Supplements Controller 2.0.0', () => {
  const server = createTestServer()

  beforeAll(async () => {
    server.decorate('request', 'logger', {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn()
    })
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })

    await server.register([parcel])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [{ sheet_id: 'SX0679', parcel_id: '9238', area_sqm: 100000 }],
      enabledActions
    })
    mockGetCompatibilityMatrix.mockResolvedValue(compatibilityMatrix)
  })

  const requestSupplements = (payload) =>
    server.inject({
      method: 'POST',
      url: '/api/v2/parcels/supplements',
      payload: { parcelId: 'SX0679-9238', baseAction, ...payload }
    })

  test('should return the supplements of the base action, available up to its area', async () => {
    const { statusCode, result } = await requestSupplements({})

    expect(statusCode).toBe(200)
    expect(result).toEqual(
      expect.objectContaining({
        message: 'success',
        parcelId: '9238',
        sheetId: 'SX0679',
        baseActionCode: 'CLIG3'
      })
    )
    expect(result.supplements.map((s) => s.code)).toEqual([
      'GRH7',
      'GRH8',
      'GRH11'
    ])
    expect(result.supplements[0]).toEqual(
      expect.objectContaining({
        availability: { unit: 'ha', value: 2.5 },
        isAvailable: true
      })
    )
  })

  test('should read the compatibility matrix rows of the base action', async () => {
    await requestSupplements({})

    expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['CLIG3']
    )
  })

  test('should return an empty list for a base action without supplements', async () => {
    const { statusCode, result } = await requestSupplements({
      baseAction: { actionCode: 'GRH7', quantity: 1, unit: 'ha' }
    })

    expect(statusCode).toBe(200)
    expect(result.supplements).toEqual([])
  })

  test('should mark a supplement selected for more than the base action unavailable', async () => {
    const { result } = await requestSupplements({
      selectedSupplements: [{ actionCode: 'GRH7', quantity: 3, unit: 'ha' }]
    })

    expect(result.supplements[0].unavailableReason.code).toBe(
      EXCEEDS_BASE_ACTION_AREA
    )
  })

  test('should leave out supplements that are enabled but not displayed', async () => {
    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [{ sheet_id: 'SX0679', parcel_id: '9238', area_sqm: 100000 }],
      enabledActions: enabledActions.map((action) =>
        action.code === 'GRH8' ? { ...action, display: false } : action
      )
    })

    const { statusCode, result } = await requestSupplements({})

    expect(statusCode).toBe(200)
    expect(result.supplements.map((s) => s.code)).toEqual(['GRH7', 'GRH11'])
  })

  test('should return 400 when a selected supplement is enabled but not displayed', async () => {
    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [{ sheet_id: 'SX0679', parcel_id: '9238', area_sqm: 100000 }],
      enabledActions: enabledActions.map((action) =>
        action.code === 'GRH8' ? { ...action, display: false } : action
      )
    })

    const { statusCode, result } = await requestSupplements({
      selectedSupplements: [{ actionCode: 'GRH8', quantity: 1, unit: 'ha' }]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('Not supplements of CLIG3: GRH8')
  })

  test('should return 400 when a selected action is not a supplement of the base action', async () => {
    const { statusCode, result } = await requestSupplements({
      selectedSupplements: [{ actionCode: 'GRH10', quantity: 1, unit: 'ha' }]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('Not supplements of CLIG3: GRH10')
  })

  test('should return 404 when the base action is not enabled', async () => {
    const { statusCode, result } = await requestSupplements({
      baseAction: { actionCode: 'UNKNOWN', quantity: 1, unit: 'ha' }
    })

    expect(statusCode).toBe(404)
    expect(result.message).toBe('Base action not found: UNKNOWN')
  })

  test('should return 404 when the parcel is not found', async () => {
    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: ['Land parcels not found: SX0679-9238'],
      parcels: [],
      enabledActions: []
    })

    const { statusCode, result } = await requestSupplements({})

    expect(statusCode).toBe(404)
    expect(result.message).toBe('Land parcels not found: SX0679-9238')
  })

  test.each([
    ['a missing base action', { baseAction: undefined }],
    [
      'a base action measured in metres',
      { baseAction: { actionCode: 'CLIG3', quantity: 1, unit: 'm' } }
    ],
    [
      'a base action with no area',
      { baseAction: { actionCode: 'CLIG3', quantity: 0, unit: 'ha' } }
    ],
    ['an invalid parcel id', { parcelId: 'not-a-parcel' }]
  ])('should return 400 for %s', async (_name, payload) => {
    const { statusCode } = await requestSupplements(payload)

    expect(statusCode).toBe(400)
  })

  test('should return 500 when an unexpected error is thrown', async () => {
    mockGetCompatibilityMatrix.mockRejectedValue(new Error('Database error'))

    const { statusCode } = await requestSupplements({})

    expect(statusCode).toBe(500)
  })
})
