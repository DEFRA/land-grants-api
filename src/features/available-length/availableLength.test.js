import { getAvailableLength } from './availableLength.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'

vi.mock('../parcel/queries/getParcelBoundary.query.js', () => ({
  getLandParcelBoundary: vi.fn()
}))

const PARCEL_PERIMETER_METERS = 1000

describe('getAvailableLength', () => {
  const mockLogger = { info: vi.fn(), error: vi.fn() }
  const mockRequest = {
    logger: mockLogger,
    server: { postgresDb: {} }
  }

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
      mockRequest
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
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
      mockRequest
    )

    expect(compatibilityCheckFn).toHaveBeenCalledWith('BND1', 'CHRW2')
    expect(result).toEqual({
      availableLength: 900,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 100
    })
  })

  it('excludes the action itself from sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(true)

    await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockRequest
    )

    expect(compatibilityCheckFn).not.toHaveBeenCalled()
  })

  it('excludes sibling actions whose unit of measurement is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const nonLengthSibling = { code: 'CMOR1', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(true)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, nonLengthSibling] },
      mockRequest
    )

    expect(compatibilityCheckFn).not.toHaveBeenCalled()
    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
  })

  it('should include sibling actions not matching the action code', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const unknownSibling = { code: 'UNKNOWN', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(true)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, unknownSibling] },
      mockRequest
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
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
      mockRequest
    )

    expect(compatibilityCheckFn).toHaveBeenCalledWith('BND2', 'BND1')
    expect(result).toEqual({
      availableLength: 800,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 200
    })
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
      mockRequest
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0
    })
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
      mockRequest
    )

    expect(result).toEqual({
      availableLength: 700,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300
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
      mockRequest
    )

    expect(result).toEqual({
      availableLength: 799,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 201
    })
  })

  it('calls getLandParcelBoundary with the sheet id, parcel id, db and logger', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockRequest
    )

    expect(getLandParcelBoundary).toHaveBeenCalledWith(
      landAction.sheetId,
      landAction.parcelId,
      mockRequest.server.postgresDb,
      mockRequest.logger
    )
  })

  it('returns zero available length when no boundary is found', async () => {
    getLandParcelBoundary.mockResolvedValue(null)
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockRequest
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0
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
      mockRequest
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500
    })
  })
})
