import createTestServer from '~/src/tests/test-server.js'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { getDataAndValidateRequest } from '~/src/features/parcel/validation/2.0.0/parcel.validation.js'
import { parcel } from '~/src/features/parcel/index.js'

vi.mock(
  '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)
vi.mock('~/src/features/parcel/validation/2.0.0/parcel.validation.js')

const mockGetCompatibilityMatrix = vi.mocked(getCompatibilityMatrix)
const mockGetDataAndValidateRequest = vi.mocked(getDataAndValidateRequest)

const sbi = '106284736'

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

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8, GRH11 and SPM3, AGF1 for
// SPM3, and LIG1 for GRH10
const compatibilityMatrix = [
  row('CLIG3', 'GRH7', 'SUPBAS'),
  row('CLIG3', 'GRH8', 'SUPBAS'),
  row('CLIG3', 'GRH11', 'SUPBAS'),
  row('CLIG3', 'SPM3', 'SUPBAS'),
  row('AGF1', 'SPM3', 'SUPBAS'),
  row('LIG1', 'GRH10', 'SUPBAS'),
  row('CLIG3', 'CAGF1', 'BASECO')
]

const enabledActions = [
  'CLIG3',
  'CAGF1',
  'AGF1',
  'LIG1',
  'GRH7',
  'GRH8',
  'GRH10',
  'GRH11',
  'SPM3'
].map(enabledAction)

const clig3 = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

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

  const requestSupplements = (payload, headers = {}) =>
    server.inject({
      method: 'POST',
      url: '/api/v2/parcels/supplements',
      headers: { 'X-Forwarded-Authorization': 'defra-id-token', ...headers },
      payload: {
        sbi,
        parcelId: 'SX0679-9238',
        baseActionCode: 'CLIG3',
        plannedActions: [clig3],
        ...payload
      }
    })

  test('should return the supplements of the base action, each available up to the base action area', async () => {
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
      'GRH11',
      'SPM3'
    ])
    expect(result.supplements[0]).toEqual(
      expect.objectContaining({
        availability: { unit: 'ha', value: 2.5 },
        isAvailable: true
      })
    )
    expect(result.supplements[0].hasSupplements).toBeUndefined()
    expect(result.supplements[0].baseActionCodes).toBeUndefined()
  })

  // Like /parcels, this reports what is available rather than rejecting the
  // quantity selected; /application/validate checks the quantity
  test('should not reject a selected supplement over the base action', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [clig3, { actionCode: 'GRH7', quantity: 3, unit: 'ha' }]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements[0].availability.value).toBe(2.5)
    expect(result.supplements[0].unavailableReason).toBeUndefined()
  })

  test('should return an empty list for a base action without supplements', async () => {
    const { statusCode, result } = await requestSupplements({
      baseActionCode: 'CAGF1',
      plannedActions: [{ actionCode: 'CAGF1', quantity: 1, unit: 'ha' }]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements).toEqual([])
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
    expect(result.supplements.map((s) => s.code)).toEqual([
      'GRH7',
      'GRH11',
      'SPM3'
    ])
  })

  test('should return 400 when the base action is not in the planned actions', async () => {
    const { statusCode, result } = await requestSupplements({
      baseActionCode: 'AGF1'
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('Base action missing from plannedActions: AGF1')
  })

  test("should return 400 when a supplement's base action is not in the planned actions", async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        clig3,
        { actionCode: 'SPM3', quantity: 1, unit: 'ha', baseActionCode: 'AGF1' }
      ]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe(
      "SPM3's baseActionCode AGF1 is not in plannedActions"
    )
    expect(mockGetCompatibilityMatrix).not.toHaveBeenCalled()
  })

  test('should return 400 when a planned action is given a base action it is not a supplement of', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        clig3,
        { actionCode: 'LIG1', quantity: 1, unit: 'ha' },
        { actionCode: 'GRH7', quantity: 1, unit: 'ha', baseActionCode: 'LIG1' }
      ]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('GRH7 is not a supplement of LIG1')
  })

  test.each([
    ['in metres', { quantity: 100, unit: 'm' }],
    ['with no area', { quantity: 0, unit: 'ha' }]
  ])(
    'should return 400 when the base action is given %s',
    async (_name, area) => {
      const { statusCode, result } = await requestSupplements({
        plannedActions: [{ ...clig3, ...area }]
      })

      expect(statusCode).toBe(400)
      expect(result.message).toBe(
        'Base action must be given as an area greater than zero, in ha or sqm: CLIG3'
      )
    }
  )

  test('should return 401 without the end user token', async () => {
    const { statusCode, result } = await requestSupplements(
      {},
      { 'X-Forwarded-Authorization': '' }
    )

    expect(statusCode).toBe(401)
    expect(result.message).toBe('X-Forwarded-Authorization is required')
  })

  test('should return 404 when the base action is not enabled', async () => {
    const { statusCode, result } = await requestSupplements({
      baseActionCode: 'UNKNOWN',
      plannedActions: [{ actionCode: 'UNKNOWN', quantity: 1, unit: 'ha' }]
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
    ['a missing sbi', { sbi: undefined }],
    ['a missing base action', { baseActionCode: undefined }],
    ['several base actions', { baseActionCode: ['CLIG3', 'AGF1'] }],
    ['missing planned actions', { plannedActions: undefined }],
    [
      'selected supplements, which go in the planned actions',
      { selectedSupplements: [] }
    ],
    [
      'a planned action without a unit',
      { plannedActions: [{ actionCode: 'CAGF1', quantity: 1 }] }
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
