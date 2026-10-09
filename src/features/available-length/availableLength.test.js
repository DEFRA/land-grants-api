import {
  calculateAvailableLength,
  getAvailableLength
} from './availableLength.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'

vi.mock('../parcel/queries/getParcelBoundary.query.js')

const PARCEL_PERIMETER_METERS = 1000

describe('getAvailableLength', () => {
  // BND1, BND2 and ACT2 are linear actions measured in metres; CMOR1 is area-based
  const actions = [
    { code: 'BND1', applicationUnitOfMeasurement: 'm' },
    { code: 'BND2', applicationUnitOfMeasurement: 'm' },
    { code: 'ACT2', applicationUnitOfMeasurement: 'm' },
    { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' }
  ]

  const landAction = {
    sheetId: 'SH123',
    parcelId: '9456',
    actions: []
  }

  const compatibilityCheckFn = vi.fn()
  const mockDb = {}
  const mockLogger = { info: vi.fn(), error: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    getLandParcelBoundary.mockResolvedValue({
      boundaryLengthMeters: PARCEL_PERIMETER_METERS
    })
  })

  it('returns the full boundary length when there are no incompatible actions', async () => {
    const action = { code: '', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0,
      exceedsBoundary: false,
      incompatibleActions: []
    })
  })

  it('subtracts the length of incompatible sibling actions on the same parcel', async () => {
    const action = { code: 'CHRW2', quantity: 50 }
    const sibling = { code: 'BND1', quantity: 100 }
    compatibilityCheckFn.mockImplementation((code) => code !== sibling.code)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND1', billedLengthMeters: 100 }
    ])
  })

  it('excludes the action itself from sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose unit of measurement is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const nonLengthSibling = { code: 'CMOR1', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, nonLengthSibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose code is not configured, since nothing says they compete for the boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const unknownSibling = { code: 'UNKNOWN', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, unknownSibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('subtracts the length of incompatible existing agreement actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockImplementation(
      (code) => code !== agreement.actionCode
    )

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND2', billedLengthMeters: 200 }
    ])
  })

  it('excludes agreement actions whose unit is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const areaAgreement = { actionCode: 'CMOR1', quantity: 15000, unit: 'sqm' }
    const countAgreement = { actionCode: 'WBD1', quantity: 800, unit: 'count' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [areaAgreement, countAgreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('combines incompatible lengths from both agreements and sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const sibling = { code: 'BND2', quantity: 100 }
    const agreement = { actionCode: 'CHRW2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 700,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300,
      exceedsBoundary: false,
      incompatibleActions: [
        { actionCode: 'CHRW2', billedLengthMeters: 200 },
        { actionCode: 'BND2', billedLengthMeters: 100 }
      ]
    })
  })

  it('rounds fractional quantities when summing incompatible lengths', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200.6, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 799,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 201,
      exceedsBoundary: false,
      incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 200.6 }]
    })
  })

  it('reads the boundary of the parcel the action is applied for', async () => {
    const action = { code: 'BND1', quantity: 50 }

    await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(getLandParcelBoundary).toHaveBeenCalledTimes(1)
    expect(getLandParcelBoundary).toHaveBeenCalledWith(
      'SH123',
      '9456',
      mockDb,
      mockLogger
    )
  })

  it('returns zero available length when the parcel has no readable boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }
    getLandParcelBoundary.mockResolvedValue(null)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0,
      exceedsBoundary: false,
      incompatibleActions: []
    })
  })

  it('reports the incompatible length even when the boundary cannot be read', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)
    getLandParcelBoundary.mockResolvedValue(null)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 200,
      exceedsBoundary: true,
      incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 200 }]
    })
  })

  it('clamps the available length at zero when the incompatible length exceeds the boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }
    // BND2 is paid per side, so a 1000 m boundary can legitimately carry 1500 m
    const agreement = { actionCode: 'BND2', quantity: 1500, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500,
      exceedsBoundary: true,
      incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 1500 }]
    })
  })
})

describe('calculateAvailableLength', () => {
  const compatibilityCheckFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the whole boundary when nothing competes for it', () => {
    const result = calculateAvailableLength(
      'BND1',
      [],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0,
      exceedsBoundary: false,
      incompatibleActions: []
    })
  })

  it('subtracts the length committed to an incompatible action', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 200 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.availableLength).toBe(800)
  })

  it('leaves the boundary intact when the competing action is compatible', () => {
    compatibilityCheckFn.mockReturnValue(true)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 200 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.availableLength).toBe(PARCEL_PERIMETER_METERS)
  })

  it('sums the lengths of every incompatible action', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [
        { actionCode: 'BND2', billedLengthMeters: 200 },
        { actionCode: 'CHRW2', billedLengthMeters: 100 }
      ],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.incompatibleLengthMeters).toBe(300)
  })

  it('names only the incompatible actions it deducted', () => {
    compatibilityCheckFn.mockImplementation((code) => code === 'CNUM1')

    const result = calculateAvailableLength(
      'BND1',
      [
        { actionCode: 'BND2', billedLengthMeters: 200 },
        { actionCode: 'CNUM1', billedLengthMeters: 100 }
      ],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND2', billedLengthMeters: 200 }
    ])
  })

  it('asks whether each existing action is compatible with the action applied for', () => {
    compatibilityCheckFn.mockReturnValue(true)

    calculateAvailableLength(
      'BND1',
      [
        { actionCode: 'BND2', billedLengthMeters: 200 },
        { actionCode: 'CHRW2', billedLengthMeters: 100 }
      ],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(compatibilityCheckFn.mock.calls).toEqual([
      ['BND2', 'BND1'],
      ['CHRW2', 'BND1']
    ])
  })

  it('rounds each action to whole metres before summing them', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [
        { actionCode: 'BND2', billedLengthMeters: 200.6 },
        { actionCode: 'CHRW2', billedLengthMeters: 200.6 }
      ],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.incompatibleLengthMeters).toBe(402)
  })

  it('clamps the available length at zero when the boundary is oversubscribed', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 1500 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.availableLength).toBe(0)
  })

  it('reports a boundary claimed beyond its length as exceeded', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 1500 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.exceedsBoundary).toBe(true)
  })

  it('does not count a boundary filled exactly as exceeded', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: PARCEL_PERIMETER_METERS }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result.exceedsBoundary).toBe(false)
  })

  it('reports no available length on a parcel with no boundary', () => {
    const result = calculateAvailableLength('BND1', [], compatibilityCheckFn, 0)

    expect(result.availableLength).toBe(0)
  })
})
