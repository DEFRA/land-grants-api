import createTestServer from '~/src/tests/test-server.js'
import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { getDataAndValidateRequest } from '~/src/features/parcel/validation/2.0.0/parcel.validation.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { getActionsForParcel } from '~/src/features/parcel/service/2.0.0/parcel.service.js'
import { parcel } from '~/src/features/parcel/index.js'

vi.mock(
  '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
)
vi.mock('~/src/features/parcel/validation/2.0.0/parcel.validation.js')
vi.mock('~/src/features/agreements/repo.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getAgreements: vi.fn() }
})
vi.mock(
  '~/src/features/parcel/service/2.0.0/parcel.service.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, getActionsForParcel: vi.fn() }
  }
)

const mockGetCompatibilityMatrix = vi.mocked(getCompatibilityMatrix)
const mockGetDataAndValidateRequest = vi.mocked(getDataAndValidateRequest)
const mockGetAgreements = vi.mocked(getAgreements)
const mockGetActionsForParcel = vi.mocked(getActionsForParcel)

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

const baseAction = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

// What the available area calculation reports for each supplement, in ha
const parcelAvailabilityHa = { GRH7: 10, GRH8: 1.5, GRH11: 0, SPM3: 10 }

// As /parcels reports an action, held to the cap the supplements endpoint gives
const parcelAction = (code, capSqm) => {
  const value = Math.min(parcelAvailabilityHa[code], Math.round(capSqm) / 10000)
  return {
    code,
    description: `${code} description`,
    version: '1.0.0',
    availability: { unit: 'ha', value },
    isAvailable: value > 0,
    ...(value === 0 && {
      unavailableReason: {
        code: 'no-availability',
        reason: 'There is no remaining availability for this action',
        metadata: {}
      }
    }),
    hasSupplements: false,
    quantityRequired: true,
    ratePerUnitGbp: 10
  }
}

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
    mockGetAgreements.mockResolvedValue({})
    mockGetActionsForParcel.mockImplementation(
      (
        _parcel,
        _payload,
        _showResults,
        { displayedActions, availableAreaCapSqm }
      ) =>
        Promise.resolve({
          parcelId: '9238',
          sheetId: 'SX0679',
          actions: displayedActions.map((action) =>
            parcelAction(action.code, availableAreaCapSqm[action.code])
          )
        })
    )
  })

  const requestSupplements = (payload, headers = {}) =>
    server.inject({
      method: 'POST',
      url: '/api/v2/parcels/supplements',
      headers: { 'X-Forwarded-Authorization': 'defra-id-token', ...headers },
      payload: {
        sbi,
        parcelId: 'SX0679-9238',
        baseAction: 'CLIG3',
        plannedActions: [baseAction],
        ...payload
      }
    })

  const plannedActionsFor = (code) => {
    const call = mockGetActionsForParcel.mock.calls.find(
      ([, , , { displayedActions }]) => displayedActions[0].code === code
    )
    return call[1].plannedActions
  }

  test('should return the supplements of the base action, each capped at the base action area', async () => {
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
    // GRH7 could cover 10 ha of the parcel, but no more than 2.5 ha of CLIG3
    expect(result.supplements[0]).toEqual(
      expect.objectContaining({
        availability: { unit: 'ha', value: 2.5 },
        isAvailable: true
      })
    )
    expect(result.supplements[0].hasSupplements).toBeUndefined()
    expect(result.supplements[0].baseActionCodes).toBeUndefined()
  })

  test('should report less than the base action area when the parcel has less left for the supplement', async () => {
    const { result } = await requestSupplements({})

    expect(result.supplements[1]).toEqual(
      expect.objectContaining({
        code: 'GRH8',
        availability: { unit: 'ha', value: 1.5 },
        isAvailable: true
      })
    )
    expect(result.supplements[2]).toEqual(
      expect.objectContaining({
        code: 'GRH11',
        availability: { unit: 'ha', value: 0 },
        isAvailable: false,
        unavailableReason: expect.objectContaining({ code: 'no-availability' })
      })
    )
  })

  test('should read the compatibility matrix with the types under which actions share land', async () => {
    await requestSupplements({})

    expect(mockGetCompatibilityMatrix).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      null,
      ['BASECO', 'SUPBAS', 'SUPCO']
    )
  })

  test('should work out each supplement against every action selected on the parcel, as /parcels does', async () => {
    const cagf1 = { actionCode: 'CAGF1', quantity: 1, unit: 'ha' }
    const grh8 = { actionCode: 'GRH8', quantity: 1, unit: 'ha' }

    await requestSupplements({ plannedActions: [cagf1, baseAction, grh8] })

    // Each supplement's own selection counts too
    expect(plannedActionsFor('GRH7')).toEqual([cagf1, baseAction, grh8])
    expect(plannedActionsFor('GRH8')).toEqual([cagf1, baseAction, grh8])
  })

  test('should leave a supplement what the supplements selected leave of the base action', async () => {
    const { result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH8', quantity: 1, unit: 'ha' }
      ]
    })

    // GRH7 and GRH8 have no SUPCO row, so GRH8 takes 1 of the 2.5 ha of CLIG3
    expect(result.supplements[0].availability).toEqual({
      unit: 'ha',
      value: 1.5
    })
  })

  test('should give a supplement with several bases only the area of the base action asked about', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'AGF1', quantity: 3, unit: 'ha' }
      ]
    })

    expect(statusCode).toBe(200)
    // SPM3 can also sit on AGF1, but only the 2.5 ha of CLIG3 are asked about
    expect(result.supplements[3]).toEqual(
      expect.objectContaining({
        code: 'SPM3',
        availability: { unit: 'ha', value: 2.5 }
      })
    )
  })

  test('should leave the base action alone for a supplement selected on another base action', async () => {
    const spm3OnAgf1 = {
      actionCode: 'SPM3',
      quantity: 2,
      unit: 'ha',
      baseAction: 'AGF1'
    }

    const { result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'AGF1', quantity: 3, unit: 'ha' },
        spm3OnAgf1
      ]
    })

    expect(result.supplements[0].availability.value).toBe(2.5)
    // It still competes for the parcel's land
    expect(plannedActionsFor('GRH7')).toContainEqual(spm3OnAgf1)
  })

  test("should count the business's current agreements on the parcel", async () => {
    const agreement = {
      actionCode: 'CAGF1',
      quantity: 2,
      unit: 'ha',
      startDate: '2025-01-01',
      endDate: '2099-01-01'
    }
    const expired = { ...agreement, endDate: '2025-06-01' }
    mockGetAgreements.mockResolvedValue({ '9238-SX0679': [agreement, expired] })

    await requestSupplements({})

    expect(mockGetAgreements).toHaveBeenCalledWith(
      sbi,
      [['9238', 'SX0679']],
      { type: 'external', value: 'defra-id-token' },
      expect.anything(),
      expect.anything()
    )
    expect(mockGetActionsForParcel.mock.calls[0][6]).toEqual([agreement])
  })

  test('should report what is left on top of a selected supplement', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH7', quantity: 1, unit: 'ha' }
      ]
    })

    expect(statusCode).toBe(200)
    // GRH7 takes 1 of the 2.5 ha of CLIG3
    expect(result.supplements[0].availability).toEqual({
      unit: 'ha',
      value: 1.5
    })
  })

  test('should report a supplement selected on the whole base action as having nothing left', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH7', quantity: 2.5, unit: 'ha', baseAction: 'CLIG3' }
      ]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements[0]).toEqual(
      expect.objectContaining({
        availability: { unit: 'ha', value: 0 },
        isAvailable: false,
        unavailableReason: expect.objectContaining({ code: 'no-availability' })
      })
    )
  })

  // Like /parcels, this reports what is available rather than rejecting the
  // quantity selected; /application/validate checks the quantity
  test('should not reject a selected supplement over the base action', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH7', quantity: 3, unit: 'ha' }
      ]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements[0].availability.value).toBe(0)
  })

  test('should return an empty list, without reading agreements, for a base action without supplements', async () => {
    const { statusCode, result } = await requestSupplements({
      baseAction: 'CAGF1',
      plannedActions: [{ actionCode: 'CAGF1', quantity: 1, unit: 'ha' }]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements).toEqual([])
    expect(mockGetAgreements).not.toHaveBeenCalled()
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

  test('should count a supplement selected that is enabled but not displayed', async () => {
    mockGetDataAndValidateRequest.mockResolvedValue({
      errors: null,
      parcels: [{ sheet_id: 'SX0679', parcel_id: '9238', area_sqm: 100000 }],
      enabledActions: enabledActions.map((action) =>
        action.code === 'GRH8' ? { ...action, display: false } : action
      )
    })

    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH8', quantity: 1, unit: 'ha' }
      ]
    })

    expect(statusCode).toBe(200)
    expect(result.supplements[0].availability.value).toBe(1.5)
  })

  test('should return 400 when the base action is not in the planned actions', async () => {
    const { statusCode, result } = await requestSupplements({
      baseAction: 'AGF1'
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('Base action missing from plannedActions: AGF1')
  })

  test("should return 400 when a supplement's base action is not in the planned actions", async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'SPM3', quantity: 1, unit: 'ha', baseAction: 'AGF1' }
      ]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe(
      "SPM3's baseAction AGF1 is not in plannedActions"
    )
    expect(mockGetCompatibilityMatrix).not.toHaveBeenCalled()
  })

  test('should return 400 when a planned action is given a base action it is not a supplement of', async () => {
    const { statusCode, result } = await requestSupplements({
      plannedActions: [
        baseAction,
        { actionCode: 'LIG1', quantity: 1, unit: 'ha' },
        { actionCode: 'GRH7', quantity: 1, unit: 'ha', baseAction: 'LIG1' }
      ]
    })

    expect(statusCode).toBe(400)
    expect(result.message).toBe('GRH7 is not a supplement of LIG1')
    expect(mockGetActionsForParcel).not.toHaveBeenCalled()
  })

  test.each([
    ['in metres', { quantity: 100, unit: 'm' }],
    ['with no area', { quantity: 0, unit: 'ha' }]
  ])(
    'should return 400 when the base action is given %s',
    async (_name, area) => {
      const { statusCode, result } = await requestSupplements({
        plannedActions: [{ ...baseAction, ...area }]
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
      baseAction: 'UNKNOWN',
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
    ['a missing base action', { baseAction: undefined }],
    ['several base actions', { baseAction: ['CLIG3', 'AGF1'] }],
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
