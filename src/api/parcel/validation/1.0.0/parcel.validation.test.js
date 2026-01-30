import {
  getAndValidateParcels,
  getDataAndValidateRequest
} from './parcel.validation.js'
import { splitParcelId } from '../../service/parcel.service.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { getLandData } from '../../queries/getLandData.query.js'
import { vi } from 'vitest'

// Mock the dependencies
vi.mock('../../service/parcel.service.js')
vi.mock('~/src/api/actions/queries/getActions.query.js')
vi.mock('../../queries/getLandData.query.js')

describe('Parcel Validation 1.0.0', () => {
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

  describe('getAndValidateParcels', () => {
    test('should return valid parcels when all parcels are found', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'SX0679', parcelId: '9239' }
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

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: [mockParcel1, mockParcel2]
      })

      expect(getLandData).toHaveBeenCalledTimes(2)
      expect(getLandData).toHaveBeenCalledWith(
        'SX0679',
        '9238',
        mockPostgresDb,
        mockLogger
      )
      expect(getLandData).toHaveBeenCalledWith(
        'SX0679',
        '9239',
        mockPostgresDb,
        mockLogger
      )
    })

    test('should return error when one parcel is not found', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'SX0679', parcelId: '9999' }
      ]

      const mockParcel1 = {
        sheet_id: 'SX0679',
        parcel_id: '9238',
        area_sqm: 10000
      }

      getLandData.mockResolvedValueOnce([mockParcel1]).mockResolvedValueOnce([])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9999',
        parcels: []
      })
    })

    test('should return error when multiple parcels are not found', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'SX0679', parcelId: '9999' },
        { sheetId: 'SX0680', parcelId: '1234' }
      ]

      const mockParcel1 = {
        sheet_id: 'SX0679',
        parcel_id: '9238',
        area_sqm: 10000
      }

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9999, SX0680-1234',
        parcels: []
      })
    })

    test('should return error when all parcels are not found', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9999' },
        { sheetId: 'SX0680', parcelId: '8888' }
      ]

      getLandData.mockResolvedValue([])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9999, SX0680-8888',
        parcels: []
      })
    })

    test('should handle empty array of parcel ids', async () => {
      const sheetParcelIds = []

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: []
      })

      expect(getLandData).not.toHaveBeenCalled()
    })

    test('should handle single parcel successfully', async () => {
      const sheetParcelIds = [{ sheetId: 'SX0679', parcelId: '9238' }]

      const mockParcel = {
        sheet_id: 'SX0679',
        parcel_id: '9238',
        area_sqm: 10000
      }

      getLandData.mockResolvedValueOnce([mockParcel])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: [mockParcel]
      })
    })

    test('should handle getLandData returning null', async () => {
      const sheetParcelIds = [{ sheetId: 'SX0679', parcelId: '9238' }]

      getLandData.mockResolvedValueOnce(null)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9238',
        parcels: []
      })
    })

    test('should handle getLandData returning undefined', async () => {
      const sheetParcelIds = [{ sheetId: 'SX0679', parcelId: '9238' }]

      getLandData.mockResolvedValueOnce(undefined)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9238',
        parcels: []
      })
    })

    test('should process parcels in parallel', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'SX0679', parcelId: '9239' },
        { sheetId: 'SX0679', parcelId: '9240' }
      ]

      const mockParcel1 = { sheet_id: 'SX0679', parcel_id: '9238' }
      const mockParcel2 = { sheet_id: 'SX0679', parcel_id: '9239' }
      const mockParcel3 = { sheet_id: 'SX0679', parcel_id: '9240' }

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])
        .mockResolvedValueOnce([mockParcel3])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: [mockParcel1, mockParcel2, mockParcel3]
      })

      expect(getLandData).toHaveBeenCalledTimes(3)
    })

    test('should handle mixed valid and invalid parcels', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'SX0679', parcelId: '9999' },
        { sheetId: 'SX0680', parcelId: '5555' }
      ]

      const mockParcel1 = { sheet_id: 'SX0679', parcel_id: '9238' }
      const mockParcel3 = { sheet_id: 'SX0680', parcel_id: '5555' }

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockParcel3])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: SX0679-9999',
        parcels: []
      })
    })

    test('should handle different sheet IDs', async () => {
      const sheetParcelIds = [
        { sheetId: 'SX0679', parcelId: '9238' },
        { sheetId: 'TY1234', parcelId: '5678' }
      ]

      const mockParcel1 = { sheet_id: 'SX0679', parcel_id: '9238' }
      const mockParcel2 = { sheet_id: 'TY1234', parcel_id: '5678' }

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: [mockParcel1, mockParcel2]
      })
    })
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

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1, mockParcel2]
      })

      expect(splitParcelId).toHaveBeenCalledTimes(2)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9238', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9239', mockLogger)
      expect(getEnabledActions).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
    })

    test('should return error when actions are not found', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(null)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when actions array is empty', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when parcels are not found', async () => {
      const parcelIds = ['SX0679-9999']

      getLandData.mockResolvedValueOnce([])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return multiple errors when both actions and parcels are invalid', async () => {
      const parcelIds = ['SX0679-9999']

      getLandData.mockResolvedValueOnce([])
      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found', 'Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should handle single parcel successfully', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

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

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])
        .mockResolvedValueOnce([mockParcel3])

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1, mockParcel2, mockParcel3]
      })
    })

    test('should handle empty parcel IDs array', async () => {
      const parcelIds = []

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

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

      getLandData.mockResolvedValue([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(splitParcelId).toHaveBeenCalledTimes(3)
      expect(splitParcelId).toHaveBeenCalledWith('SX0679-9238', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('TY1234-5678', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('AB9999-1111', mockLogger)
    })

    test('should handle mixed validation results', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9999']

      getLandData.mockResolvedValueOnce([mockParcel1]).mockResolvedValueOnce([])

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return empty arrays when errors are present', async () => {
      const parcelIds = ['SX0679-9999']

      getLandData.mockResolvedValueOnce([])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result.errors).toHaveLength(1)
      expect(result.enabledActions).toEqual([])
      expect(result.parcels).toEqual([])
    })

    test('should handle getEnabledActions returning undefined', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(undefined)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should process all validations regardless of individual failures', async () => {
      const parcelIds = ['SX0679-9238', 'SX0679-9239']

      getLandData
        .mockResolvedValueOnce([mockParcel1])
        .mockResolvedValueOnce([mockParcel2])

      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(getLandData).toHaveBeenCalledTimes(2)
      expect(getEnabledActions).toHaveBeenCalledTimes(1)
      expect(result.errors).toContain('Actions not found')
    })

    test('should correctly map split parcel IDs to getLandData calls', async () => {
      const parcelIds = ['SX0679-9238', 'TY1234-5678']

      splitParcelId
        .mockReturnValueOnce({ sheetId: 'SX0679', parcelId: '9238' })
        .mockReturnValueOnce({ sheetId: 'TY1234', parcelId: '5678' })

      getLandData.mockResolvedValue([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      await getDataAndValidateRequest(parcelIds, mockRequest)

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

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(null)

      await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(getLandData).toHaveBeenCalled()
      expect(getEnabledActions).toHaveBeenCalled()
    })

    test('should accumulate all validation errors', async () => {
      const parcelIds = ['SX0679-9999', 'SX0680-8888']

      getLandData.mockResolvedValueOnce([]).mockResolvedValueOnce([])
      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result.errors).toHaveLength(2)
      expect(result.errors).toContain('Actions not found')
      expect(result.errors).toContain(
        'Land parcels not found: SX0679-9999, SX0680-8888'
      )
    })

    test('should skip actions validation when validateActions is false', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])

      const result = await getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        false
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: [],
        parcels: [mockParcel1]
      })

      expect(getEnabledActions).not.toHaveBeenCalled()
    })

    test('should validate actions when validateActions is true', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        true
      )

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1]
      })

      expect(getEnabledActions).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
    })

    test('should validate actions by default when validateActions parameter is omitted', async () => {
      const parcelIds = ['SX0679-9238']

      getLandData.mockResolvedValueOnce([mockParcel1])
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1]
      })

      expect(getEnabledActions).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
    })

    test('should return only parcel errors when validateActions is false and parcels are invalid', async () => {
      const parcelIds = ['SX0679-9999']

      getLandData.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(
        parcelIds,
        mockRequest,
        false
      )

      expect(result).toEqual({
        errors: ['Land parcels not found: SX0679-9999'],
        enabledActions: [],
        parcels: []
      })

      expect(getEnabledActions).not.toHaveBeenCalled()
    })
  })
})
