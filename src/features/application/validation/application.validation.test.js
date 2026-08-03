import { vi, describe, test, beforeEach, expect } from 'vitest'
import { validateRequest } from './application.validation.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')

describe('Application Validation', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }

  const mockDb = {
    connect: vi.fn()
  }

  const mockRequest = {
    server: {
      postgresDb: mockDb
    },
    logger: mockLogger
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateRequest', () => {
    test('should return empty array when all validations pass', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should return empty array when all actions are valid across multiple parcels', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }, { code: 'UPL2' }]
        },
        {
          sheetId: 'sheet1',
          parcelId: 'parcel2',
          actions: [{ code: 'CMOR1' }]
        }
      ]
      const actions = [{ code: 'UPL1' }, { code: 'UPL2' }, { code: 'CMOR1' }]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([
          { id: 2, sheet_id: 'sheet1', parcel_id: 'parcel2' }
        ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should return actions error when actions are invalid', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'INVALID_ACTION' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Actions not found: INVALID_ACTION'])
    })

    test('should return error for multiple invalid actions across parcels', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }, { code: 'INVALID1' }]
        },
        {
          sheetId: 'sheet1',
          parcelId: 'parcel2',
          actions: [{ code: 'INVALID2' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([
          { id: 2, sheet_id: 'sheet1', parcel_id: 'parcel2' }
        ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Actions not found: INVALID1,INVALID2'])
    })

    test('should return land parcels error when parcels are invalid', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue([])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Land parcels not found: sheet1-parcel1'])
    })

    test('should return error when parcel lookup returns null', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue(null)

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Land parcels not found: sheet1-parcel1'])
    })

    test('should return both errors when both validations fail', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'INVALID_ACTION' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue([])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([
        'Land parcels not found: sheet1-parcel1',
        'Actions not found: INVALID_ACTION'
      ])
    })

    test('should return multiple parcel errors for multiple missing parcels', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1', actions: [] },
        { sheetId: 'sheet2', parcelId: 'parcel2', actions: [] }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Land parcels not found: sheet2-parcel2'])
    })

    test('should handle multiple land actions with mixed validation results', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        },
        {
          sheetId: 'sheet2',
          parcelId: 'parcel2',
          actions: [{ code: 'INVALID_ACTION' }]
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([
        'Land parcels not found: sheet2-parcel2',
        'Actions not found: INVALID_ACTION'
      ])
    })

    test('should verify getLandData is called with correct parameters', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1', actions: [{ code: 'UPL1' }] },
        { sheetId: 'sheet2', parcelId: 'parcel2', actions: [{ code: 'UPL1' }] }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([
          { id: 2, sheet_id: 'sheet2', parcel_id: 'parcel2' }
        ])

      await validateRequest(landActions, actions, mockRequest)
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

    test('should handle empty landActions array', async () => {
      const landActions = []
      const actions = [{ code: 'UPL1' }]

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
      expect(getLandData).not.toHaveBeenCalled()
    })

    test('should handle empty actions array', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = []

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual(['Actions not found: UPL1'])
    })

    test('should handle landActions with no actions', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: []
        }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should handle null/undefined landActions', async () => {
      const landActions = null
      const actions = [{ code: 'UPL1' }]

      await expect(
        validateRequest(landActions, actions, mockRequest)
      ).rejects.toThrow()
    })

    test('should handle null/undefined actions', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = null

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      await expect(
        validateRequest(landActions, actions, mockRequest)
      ).rejects.toThrow()
    })

    test('should propagate database errors from parcel lookup', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1', actions: [] }
      ]
      const actions = [{ code: 'UPL1' }]

      getLandData.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        validateRequest(landActions, actions, mockRequest)
      ).rejects.toThrow('Database connection failed')
    })
  })
})
