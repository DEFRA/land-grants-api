import { vi } from 'vitest'
import { validatePaymentCalculationRequest } from './payment-calculation.validation.js'
import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
import { getAndValidateParcels } from '~/src/features/parcel/validation/1.0.0/parcel.validation.js'

vi.mock('~/src/features/parcel/service/parcel.service.js')
vi.mock('~/src/features/parcel/validation/1.0.0/parcel.validation.js')

describe('validatePaymentCalculationRequest', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }

  const mockRequest = {
    server: { postgresDb: {} },
    logger: mockLogger
  }

  beforeEach(() => {
    splitParcelId.mockImplementation((parcelId) => {
      const [sheetId, parcelIdPart] = parcelId.split('-')
      return { sheetId, parcelId: parcelIdPart }
    })
  })

  test('should return parcels when all parcel IDs are valid', async () => {
    const parcelIds = ['SX067-99238', 'SX067-99239']
    const mockParcels = [
      { sheet_id: 'SX067', parcel_id: '99238' },
      { sheet_id: 'SX067', parcel_id: '99239' }
    ]

    getAndValidateParcels.mockResolvedValue({
      errors: null,
      parcels: mockParcels
    })

    const result = await validatePaymentCalculationRequest(
      parcelIds,
      mockRequest
    )

    expect(result).toEqual({ errors: null, parcels: mockParcels })
  })

  test('should call splitParcelId for each parcel ID', async () => {
    const parcelIds = ['SX067-99238', 'SX067-99239']

    getAndValidateParcels.mockResolvedValue({ errors: null, parcels: [] })

    await validatePaymentCalculationRequest(parcelIds, mockRequest)

    expect(splitParcelId).toHaveBeenCalledTimes(2)
    expect(splitParcelId).toHaveBeenCalledWith('SX067-99238', mockLogger)
    expect(splitParcelId).toHaveBeenCalledWith('SX067-99239', mockLogger)
  })

  test('should pass the mapped parcels and request to getAndValidateParcels', async () => {
    const parcelIds = ['SX067-99238']

    splitParcelId.mockReturnValue({ sheetId: 'SX067', parcelId: '99238' })
    getAndValidateParcels.mockResolvedValue({ errors: null, parcels: [] })

    await validatePaymentCalculationRequest(parcelIds, mockRequest)

    expect(getAndValidateParcels).toHaveBeenCalledWith(
      [{ sheetId: 'SX067', parcelId: '99238' }],
      mockRequest
    )
  })

  test('should return errors and empty parcels when getAndValidateParcels returns errors', async () => {
    const parcelIds = ['SX067-99999']
    const parcelError = 'Land parcels not found: SX067-99999'

    getAndValidateParcels.mockResolvedValue({
      errors: parcelError,
      parcels: []
    })

    const result = await validatePaymentCalculationRequest(
      parcelIds,
      mockRequest
    )

    expect(result).toEqual({ errors: [parcelError], parcels: [] })
  })

  test('should return errors and empty parcels when multiple parcels are not found', async () => {
    const parcelIds = ['SX067-99999', 'SX067-88888']
    const parcelError = 'Land parcels not found: SX067-99999, SX067-88888'

    getAndValidateParcels.mockResolvedValue({
      errors: parcelError,
      parcels: []
    })

    const result = await validatePaymentCalculationRequest(
      parcelIds,
      mockRequest
    )

    expect(result).toEqual({ errors: [parcelError], parcels: [] })
  })
})
