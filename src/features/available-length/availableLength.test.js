import { getAvailableLength } from './availableLength.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'

vi.mock('../parcel/queries/getParcelBoundary.query.js', () => ({
  getLandParcelBoundary: vi.fn()
}))

describe('getAvailableLength', () => {
  const mockLogger = { info: vi.fn(), error: vi.fn() }
  const mockRequest = {
    logger: mockLogger,
    server: { postgresDb: {} }
  }

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
    getLandParcelBoundary.mockResolvedValue({ boundaryLengthMeters: 1000 })
  })

  it('returns the full boundary length when there are no incompatible actions', async () => {
    const action = { code: '', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockRequest
    )

    expect(result).toEqual({ availableLength: 1000 })
  })

  it('subtracts the length of incompatible sibling actions on the same parcel', async () => {
    const action = { code: 'CHRW2', quantity: 50 }
    const sibling = { code: 'BND1', quantity: 100 }
    compatibilityCheckFn.mockImplementation((code) => code !== sibling.code)

    const result = await getAvailableLength(
      action,
      actions,
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      mockRequest
    )

    expect(compatibilityCheckFn).toHaveBeenCalledWith('BND1', 'CHRW2')
    expect(result).toEqual({ availableLength: 900 })
  })

  it('excludes the action itself from sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(true)

    await getAvailableLength(
      action,
      actions,
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
      compatibilityCheckFn,
      { ...landAction, actions: [action, nonLengthSibling] },
      mockRequest
    )

    expect(compatibilityCheckFn).not.toHaveBeenCalled()
    expect(result).toEqual({ availableLength: 1000 })
  })

  it('should include sibling actions not matching the action code', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const unknownSibling = { code: 'UNKNOWN', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(true)

    const result = await getAvailableLength(
      action,
      actions,
      compatibilityCheckFn,
      { ...landAction, actions: [action, unknownSibling] },
      mockRequest
    )

    expect(result).toEqual({ availableLength: 1000 })
  })

  it('rounds fractional quantities when summing incompatible lengths', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const action2 = { actionCode: 'BND2', quantity: 200.6 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      compatibilityCheckFn,
      { ...landAction, actions: [action, action2] },
      mockRequest
    )

    expect(result).toEqual({ availableLength: 1000 - 201 })
  })

  it('calls getLandParcelBoundary with the sheet id, parcel id, db and logger', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    await getAvailableLength(
      action,
      actions,
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
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockRequest
    )

    expect(result).toEqual({ availableLength: 0 })
  })

  it('can return a negative available length when incompatible length exceeds the boundary', async () => {
    const action = { code: 'BND1', quantity: 500 }
    const action2 = { code: 'BND2', quantity: 1500 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      compatibilityCheckFn,
      { ...landAction, actions: [action, action2] },
      mockRequest
    )

    expect(result).toEqual({ availableLength: -500 })
  })
})
