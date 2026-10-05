import {
  calculateAvailableLength,
  getAvailableLength
} from './availableLength.js'

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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the full boundary length when there are no incompatible actions', () => {
    const action = { code: '', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
  })

  it('subtracts the length of incompatible sibling actions on the same parcel', () => {
    const action = { code: 'CHRW2', quantity: 50 }
    const sibling = { code: 'BND1', quantity: 100 }
    compatibilityCheckFn.mockImplementation((code) => code !== sibling.code)

    const result = getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      PARCEL_PERIMETER_METERS
    )

    expect(compatibilityCheckFn).toHaveBeenCalledWith('BND1', 'CHRW2')
    expect(result).toEqual({
      availableLength: 900,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 100
    })
  })

  it('excludes the action itself from sibling actions', () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(true)

    getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(compatibilityCheckFn).not.toHaveBeenCalled()
  })

  it('excludes sibling actions whose unit of measurement is not meters', () => {
    const action = { code: 'BND1', quantity: 50 }
    const nonLengthSibling = { code: 'CMOR1', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(true)

    const result = getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, nonLengthSibling] },
      PARCEL_PERIMETER_METERS
    )

    expect(compatibilityCheckFn).not.toHaveBeenCalled()
    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
  })

  it('excludes sibling actions whose code is not configured, since nothing says they compete for the boundary', () => {
    const action = { code: 'BND1', quantity: 50 }
    const unknownSibling = { code: 'UNKNOWN', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, unknownSibling] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
  })

  it('subtracts the length of incompatible existing agreement actions', () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockImplementation(
      (code) => code !== agreement.actionCode
    )

    const result = getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(compatibilityCheckFn).toHaveBeenCalledWith('BND2', 'BND1')
    expect(result).toEqual({
      availableLength: 800,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 200
    })
  })

  it('excludes agreement actions whose unit is not meters', () => {
    const action = { code: 'BND1', quantity: 50 }
    const areaAgreement = { actionCode: 'CMOR1', quantity: 15000, unit: 'sqm' }
    const countAgreement = { actionCode: 'WBD1', quantity: 800, unit: 'count' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [areaAgreement, countAgreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
  })

  it('combines incompatible lengths from both agreements and sibling actions', () => {
    const action = { code: 'BND1', quantity: 50 }
    const sibling = { code: 'BND2', quantity: 100 }
    const agreement = { actionCode: 'CHRW2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: 700,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300
    })
  })

  it('rounds fractional quantities when summing incompatible lengths', () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200.6, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: 799,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 201
    })
  })

  it('returns zero available length when the parcel has no readable boundary', () => {
    const action = { code: 'BND1', quantity: 50 }
    const NO_BOUNDARY_METERS = 0

    const result = getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      NO_BOUNDARY_METERS
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0
    })
  })

  it('clamps the available length at zero when the incompatible length exceeds the boundary', () => {
    const action = { code: 'BND1', quantity: 50 }
    // BND2 is paid per side, so a 1000 m boundary can legitimately carry 1500 m
    const agreement = { actionCode: 'BND2', quantity: 1500, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500
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
      incompatibleLengthMeters: 0
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

    expect(result).toEqual({
      availableLength: 800,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 200
    })
  })

  it('leaves the boundary intact when the competing action is compatible', () => {
    compatibilityCheckFn.mockReturnValue(true)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 200 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
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

    expect(result).toEqual({
      availableLength: 700,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300
    })
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

    expect(result).toEqual({
      availableLength: 598,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 402
    })
  })

  it('clamps the available length at zero when the boundary is oversubscribed', () => {
    compatibilityCheckFn.mockReturnValue(false)

    const result = calculateAvailableLength(
      'BND1',
      [{ actionCode: 'BND2', billedLengthMeters: 1500 }],
      compatibilityCheckFn,
      PARCEL_PERIMETER_METERS
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500
    })
  })

  it('reports no available length on a parcel with no boundary', () => {
    const result = calculateAvailableLength('BND1', [], compatibilityCheckFn, 0)

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0
    })
  })
})
