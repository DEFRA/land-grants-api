import * as parcelValidation from './parcel.validation.js'
import { splitParcelId } from '../../service/2.0.0/parcel.service.js'
import { getActionsByLatestVersion } from '../../../actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getLandData } from '../../queries/getLandData.query.js'
import { vi } from 'vitest'

// Mock the dependencies
vi.mock('../../service/2.0.0/parcel.service.js')
vi.mock('../../../actions/queries/2.0.0/getActionsByLatestVersion.query.js')
vi.mock('../../queries/getLandData.query.js')

/**
 * Stub {@link getLandData} so {@link parcelValidation.getAndValidateParcels} can run without a database.
 * @param {Record<string, object | undefined>} rowByKey - Keys `sheetId-parcelId`; missing key or `undefined` means not found.
 */
function stubLandParcels(rowByKey) {
  getLandData.mockImplementation((sheetId, parcelId) => {
    const row = rowByKey[`${sheetId}-${parcelId}`]
    return Promise.resolve(row ? [row] : [])
  })
}

describe('Parcel Validation 2.0.0', () => {
  const mockLogger = {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }

  const mockPostgresDb = {}

  const mockRequest = {
    server: {
      postgresDb: mockPostgresDb
    },
    logger: mockLogger
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDataAndValidateRequest', () => {
    const mockEnabledActions = [
      {
        code: 'UPL1',
        description: 'Action 1',
        display: true,
        payment: { rate: 100 }
      },
      {
        code: 'UPL2',
        description: 'Action 2',
        display: true,
        payment: { rate: 200 }
      }
    ]

    const mockParcel1 = {
      sheet_id: 'SX0679',
      parcel_id: '9238',
      area_sqm: 10000
    }

    const mockParcel2 = {
      sheet_id: 'SX0679',
      parcel_id: '9239',
      area_sqm: 15000
    }

    beforeEach(() => {
      splitParcelId.mockImplementation((parcelId) => {
        const [sheetId, parcelIdPart] = parcelId.split('-')
        return { sheetId, parcelId: parcelIdPart }
      })
    })

    test('should successfully validate request with valid parcels and actions', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9239']

      stubLandParcels({
        'SX0679-9238': mockParcel1,
        'SX0679-9239': mockParcel2
      })

      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1, mockParcel2]
      })

      expect(splitParcelId).toHaveBeenCalledTimes(2)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9238', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9239', mockLogger)
      expect(getActionsByLatestVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })

    test('should return error when actions are not found', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(null)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when actions array is empty', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce([])

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when parcels are not found', async () => {
      const parcelIds = ['SX0679-9999']

      stubLandParcels({})
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return multiple errors when both actions and parcels are invalid', async () => {
      const parcelIds = ['SX0679-9999']

      stubLandParcels({})
      getActionsByLatestVersion.mockResolvedValueOnce([])

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Actions not found', 'Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should handle single parcel successfully', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1]
      })
    })

    test('should handle multiple parcels successfully', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9239', 'SX0680-5555']

      const mockParcel3 = {
        sheet_id: 'SX0680',
        parcel_id: '5555',
        area_sqm: 20000
      }

      stubLandParcels({
        'SX0679-9238': mockParcel1,
        'SX0679-9239': mockParcel2,
        'SX0680-5555': mockParcel3
      })

      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1, mockParcel2, mockParcel3]
      })
    })

    test('should handle empty parcel IDs array', async () => {
      const parcelIds = []

      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: []
      })

      expect(getLandData).not.toHaveBeenCalled()
      expect(splitParcelId).not.toHaveBeenCalled()
    })

    test('should call splitParcelId for each parcelId', async () => {
      const parcelIds = ['SX0679-9238', 'TY1234-5678', 'AB9999-1111']

      stubLandParcels({
        'SX0679-9238': mockParcel1,
        'TY1234-5678': mockParcel1,
        'AB9999-1111': mockParcel1
      })
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      await parcelValidation.getDataAndValidateRequest(parcelIds, mockRequest)

      expect(splitParcelId).toHaveBeenCalledTimes(3)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9238', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('TY1234-5678', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('AB9999-1111', mockLogger)
    })

    test('should handle mixed validation results', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9999']

      stubLandParcels({
        'SX0679-9238': mockParcel1
      })

      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return empty arrays when errors are present', async () => {
      const parcelIds = ['SX0679-9999']

      stubLandParcels({})
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result.errors).toHaveLength(1)
      expect(result.enabledActions).toEqual([])
      expect(result.parcels).toEqual([])
    })

    test('should handle getEnabledActions returning undefined', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(undefined)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should process all validations regardless of individual failures', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9239']

      stubLandParcels({
        'SX0679-9238': mockParcel1,
        'SX0679-9239': mockParcel2
      })

      getActionsByLatestVersion.mockResolvedValueOnce([])

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(getLandData).toHaveBeenCalled()
      expect(getActionsByLatestVersion).toHaveBeenCalledTimes(1)
      expect(result.errors).toContain('Actions not found')
    })

    test('should correctly map split parcel IDs to getAndValidateParcels calls', async () => {
      const parcelIds = ['SX0679-9238', 'TY1234-5678']

      splitParcelId
        .mockReturnValueOnce({ sheetId: 'SX0679', parcelId: '9238' })
        .mockReturnValueOnce({ sheetId: 'TY1234', parcelId: '5678' })

      stubLandParcels({
        'SX0679-9238': mockParcel1,
        'TY1234-5678': mockParcel1
      })
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      await parcelValidation.getDataAndValidateRequest(parcelIds, mockRequest)

      expect(getLandData).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        mockPostgresDb,
        mockLogger
      )
      expect(getLandData).toHaveBeenCalledWith(
        'TY1234',
        '5678',
        mockPostgresDb,
        mockLogger
      )
    })

    test('should handle actions validation failing without affecting parcel lookup', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(null)

      await parcelValidation.getDataAndValidateRequest(parcelIds, mockRequest)

      expect(getLandData).toHaveBeenCalled()
      expect(getActionsByLatestVersion).toHaveBeenCalled()
    })

    test('should accumulate all validation errors', async () => {
      const parcelIds = ['SX0679-9999', 'SX0680-8888']

      stubLandParcels({})
      getActionsByLatestVersion.mockResolvedValueOnce([])

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContain('Actions not found')
      expect(result.errors).toContain(
        'Land parcels not found: SX0679-9999, SX0680-8888'
      )
    })

    test('should skip actions validation when validateActions is false', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        false
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: [],
        parcels: [mockParcel1]
      })

      expect(getActionsByLatestVersion).not.toHaveBeenCalled()
    })

    test('should validate actions when validateActions is true', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        true
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1]
      })

      expect(getActionsByLatestVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })

    test('should validate actions by default when validateActions parameter is omitted', async () => {
      const parcelIds = ['SX0679-9238']

      stubLandParcels({ 'SX0679-9238': mockParcel1 })
      getActionsByLatestVersion.mockResolvedValueOnce(mockEnabledActions)

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1]
      })

      expect(getActionsByLatestVersion).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })

    test('should return only parcel errors when validateActions is false and parcels are invalid', async () => {
      const parcelIds = ['SX0679-9999']

      stubLandParcels({})

      const result = await parcelValidation.getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        false
      )

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })

      expect(getActionsByLatestVersion).not.toHaveBeenCalled()
    })
  })
})
