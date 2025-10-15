import { jest } from '@jest/globals'
import {
  getAndValidateParcels,
  getDataAndValidateRequest
} from './parcel.validation.js'
import { getLandData } from '../queries/getLandData.query.js'
import { getEnabledActions } from '../../actions/queries/getActions.query.js'
import { splitParcelId } from '../service/parcel.service.js'

jest.mock('../queries/getLandData.query.js')
jest.mock('../../actions/queries/getActions.query.js')
jest.mock('../service/parcel.service.js')

describe('Parcel Validation', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }

  const mockDb = {
    connect: jest.fn()
  }

  const mockRequest = {
    server: {
      postgresDb: mockDb
    },
    logger: mockLogger
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAndValidateParcels', () => {
    test('should return parcels when all parcels are found', async () => {
      const sheetParcelIds = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' }
      ]

      const mockParcel1 = {
        id: 1,
        sheet_id: 'sheet1',
        parcel_id: 'parcel1',
        area: 100
      }
      const mockParcel2 = {
        id: 2,
        sheet_id: 'sheet2',
        parcel_id: 'parcel2',
        area: 200
      }

      getLandData
        .mockResolvedValueOnce(mockParcel1)
        .mockResolvedValueOnce(mockParcel2)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: [mockParcel1, mockParcel2]
      })
      expect(getLandData).toHaveBeenCalledTimes(2)
      expect(getLandData).toHaveBeenCalledWith(
        'sheet1',
        'parcel1',
        mockDb,
        mockLogger
      )
      expect(getLandData).toHaveBeenCalledWith(
        'sheet2',
        'parcel2',
        mockDb,
        mockLogger
      )
    })

    test('should return errors when no parcels are found', async () => {
      const sheetParcelIds = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' }
      ]

      getLandData.mockResolvedValueOnce(null).mockResolvedValueOnce(null)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: sheet1-parcel1, sheet2-parcel2',
        parcels: []
      })
      expect(getLandData).toHaveBeenCalledTimes(2)
    })

    test('should return error for single missing parcel', async () => {
      const sheetParcelIds = [{ sheetId: 'sheet1', parcelId: 'parcel1' }]

      getLandData.mockResolvedValueOnce(null)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: sheet1-parcel1',
        parcels: []
      })
    })

    test('should return error for mixed valid and invalid parcels', async () => {
      const sheetParcelIds = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' },
        { sheetId: 'sheet3', parcelId: 'parcel3' }
      ]

      const mockParcel1 = { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      const mockParcel3 = { id: 3, sheet_id: 'sheet3', parcel_id: 'parcel3' }

      getLandData
        .mockResolvedValueOnce(mockParcel1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockParcel3)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: 'Land parcels not found: sheet2-parcel2',
        parcels: []
      })
    })

    test('should handle empty array of sheet parcel ids', async () => {
      const sheetParcelIds = []

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        parcels: []
      })
      expect(getLandData).not.toHaveBeenCalled()
    })

    test('should handle database errors', async () => {
      const sheetParcelIds = [{ sheetId: 'sheet1', parcelId: 'parcel1' }]

      getLandData.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        getAndValidateParcels(sheetParcelIds, mockRequest)
      ).rejects.toThrow('Database connection failed')
    })

    test('should handle multiple missing parcels correctly', async () => {
      const sheetParcelIds = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' },
        { sheetId: 'sheet3', parcelId: 'parcel3' }
      ]

      getLandData
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const result = await getAndValidateParcels(sheetParcelIds, mockRequest)

      expect(result).toEqual({
        errors:
          'Land parcels not found: sheet1-parcel1, sheet2-parcel2, sheet3-parcel3',
        parcels: []
      })
    })
  })

  describe('getDataAndValidateRequest', () => {
    test('should return data when all validations pass', async () => {
      const parcelIds = ['sheet1-parcel1', 'sheet2-parcel2']

      const mockParcel1 = { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      const mockParcel2 = { id: 2, sheet_id: 'sheet2', parcel_id: 'parcel2' }
      const mockEnabledActions = [
        { code: 'UPL1', display: true },
        { code: 'UPL2', display: true }
      ]

      splitParcelId
        .mockReturnValueOnce({ sheetId: 'sheet1', parcelId: 'parcel1' })
        .mockReturnValueOnce({ sheetId: 'sheet2', parcelId: 'parcel2' })

      getLandData
        .mockResolvedValueOnce(mockParcel1)
        .mockResolvedValueOnce(mockParcel2)

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel1, mockParcel2]
      })
      expect(splitParcelId).toHaveBeenCalledTimes(2)
      expect(splitParcelId).toHaveBeenCalledWith('sheet1-parcel1', mockLogger)
      expect(splitParcelId).toHaveBeenCalledWith('sheet2-parcel2', mockLogger)
      expect(getLandData).toHaveBeenCalledTimes(2)
      expect(getEnabledActions).toHaveBeenCalledWith(mockLogger, mockDb)
    })

    test('should return error when actions are not found', async () => {
      const parcelIds = ['sheet1-parcel1']

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockResolvedValueOnce({
        id: 1,
        sheet_id: 'sheet1',
        parcel_id: 'parcel1'
      })

      getEnabledActions.mockResolvedValueOnce(null)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when enabled actions is empty array', async () => {
      const parcelIds = ['sheet1-parcel1']

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockResolvedValueOnce({
        id: 1,
        sheet_id: 'sheet1',
        parcel_id: 'parcel1'
      })

      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return error when parcels are not found', async () => {
      const parcelIds = ['sheet1-parcel1', 'sheet2-parcel2']

      const mockEnabledActions = [{ code: 'UPL1', display: true }]

      splitParcelId
        .mockReturnValueOnce({ sheetId: 'sheet1', parcelId: 'parcel1' })
        .mockReturnValueOnce({ sheetId: 'sheet2', parcelId: 'parcel2' })

      getLandData.mockResolvedValueOnce(null).mockResolvedValueOnce(null)

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Land parcels not found: sheet1-parcel1, sheet2-parcel2'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should return both errors when actions and parcels validation fail', async () => {
      const parcelIds = ['sheet1-parcel1']

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockResolvedValueOnce(null)
      getEnabledActions.mockResolvedValueOnce([])

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Actions not found', 'Land parcels not found: sheet1-parcel1'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should handle empty parcel ids array', async () => {
      const parcelIds = []

      const mockEnabledActions = [{ code: 'UPL1', display: true }]

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: []
      })
      expect(splitParcelId).not.toHaveBeenCalled()
      expect(getLandData).not.toHaveBeenCalled()
    })

    test('should handle single parcel id', async () => {
      const parcelIds = ['sheet1-parcel1']

      const mockParcel = { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      const mockEnabledActions = [{ code: 'UPL1', display: true }]

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockResolvedValueOnce(mockParcel)
      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: null,
        enabledActions: mockEnabledActions,
        parcels: [mockParcel]
      })
    })

    test('should handle mixed valid and invalid parcels', async () => {
      const parcelIds = ['sheet1-parcel1', 'sheet2-parcel2', 'sheet3-parcel3']

      const mockParcel1 = { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      const mockParcel3 = { id: 3, sheet_id: 'sheet3', parcel_id: 'parcel3' }
      const mockEnabledActions = [{ code: 'UPL1', display: true }]

      splitParcelId
        .mockReturnValueOnce({ sheetId: 'sheet1', parcelId: 'parcel1' })
        .mockReturnValueOnce({ sheetId: 'sheet2', parcelId: 'parcel2' })
        .mockReturnValueOnce({ sheetId: 'sheet3', parcelId: 'parcel3' })

      getLandData
        .mockResolvedValueOnce(mockParcel1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockParcel3)

      getEnabledActions.mockResolvedValueOnce(mockEnabledActions)

      const result = await getDataAndValidateRequest(parcelIds, mockRequest)

      expect(result).toEqual({
        errors: ['Land parcels not found: sheet2-parcel2'],
        enabledActions: [],
        parcels: []
      })
    })

    test('should handle database errors from getLandData', async () => {
      const parcelIds = ['sheet1-parcel1']

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        getDataAndValidateRequest(parcelIds, mockRequest)
      ).rejects.toThrow('Database connection failed')
    })

    test('should handle errors from getEnabledActions', async () => {
      const parcelIds = ['sheet1-parcel1']

      splitParcelId.mockReturnValueOnce({
        sheetId: 'sheet1',
        parcelId: 'parcel1'
      })

      getLandData.mockResolvedValueOnce({
        id: 1,
        sheet_id: 'sheet1',
        parcel_id: 'parcel1'
      })

      getEnabledActions.mockRejectedValueOnce(
        new Error('Failed to get actions')
      )

      await expect(
        getDataAndValidateRequest(parcelIds, mockRequest)
      ).rejects.toThrow('Failed to get actions')
    })

    test('should handle errors from splitParcelId', async () => {
      const parcelIds = ['invalid-id']

      splitParcelId.mockImplementationOnce(() => {
        throw new Error('Unable to split parcel id invalid-id')
      })

      await expect(
        getDataAndValidateRequest(parcelIds, mockRequest)
      ).rejects.toThrow('Unable to split parcel id invalid-id')
    })
  })
})
