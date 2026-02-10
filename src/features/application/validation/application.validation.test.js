import { vi, describe, test, beforeEach, expect } from 'vitest'
import {
  validateRequest,
  validateLandActionsRequest,
  validateLandParcelsRequest
} from './application.validation.js'
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

  describe('validateLandActionsRequest', () => {
    test('should return null when all actions are valid', () => {
      const landActions = [
        {
          actions: [{ code: 'UPL1' }, { code: 'UPL2' }]
        },
        {
          actions: [{ code: 'CMOR1' }]
        }
      ]
      const actions = [{ code: 'UPL1' }, { code: 'UPL2' }, { code: 'CMOR1' }]

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBeNull()
    })

    test('should return error message when actions are invalid', () => {
      const landActions = [
        {
          actions: [{ code: 'UPL1' }, { code: 'INVALID1' }]
        },
        {
          actions: [{ code: 'INVALID2' }]
        }
      ]
      const actions = [{ code: 'UPL1' }, { code: 'UPL2' }]

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBe('Actions not found: INVALID1,INVALID2')
    })

    test('should return error message for single invalid action', () => {
      const landActions = [
        {
          actions: [{ code: 'INVALID_ACTION' }]
        }
      ]
      const actions = [{ code: 'UPL1' }, { code: 'UPL2' }]

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBe('Actions not found: INVALID_ACTION')
    })

    test('should handle empty landActions array', () => {
      const landActions = []
      const actions = [{ code: 'UPL1' }]

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBeNull()
    })

    test('should handle empty actions array', () => {
      const landActions = [
        {
          actions: [{ code: 'UPL1' }]
        }
      ]
      const actions = []

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBe('Actions not found: UPL1')
    })

    test('should handle landActions with no actions', () => {
      const landActions = [
        {
          actions: []
        }
      ]
      const actions = [{ code: 'UPL1' }]

      const result = validateLandActionsRequest(landActions, actions)
      expect(result).toBeNull()
    })
  })

  describe('validateLandParcelsRequest', () => {
    test('should return null when all parcels exist', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' }
      ]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([
          { id: 2, sheet_id: 'sheet2', parcel_id: 'parcel2' }
        ])

      const result = await validateLandParcelsRequest(landActions, mockRequest)
      expect(result).toBeNull()
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

    test('should return error message when parcels do not exist', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' }
      ]

      getLandData.mockResolvedValueOnce([]).mockResolvedValueOnce(null)

      const result = await validateLandParcelsRequest(landActions, mockRequest)
      expect(result).toBe(
        'Land parcels not found: sheet1-parcel1, sheet2-parcel2'
      )
    })

    test('should return error message for mixed valid and invalid parcels', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1' },
        { sheetId: 'sheet2', parcelId: 'parcel2' },
        { sheetId: 'sheet3', parcelId: 'parcel3' }
      ]

      getLandData
        .mockResolvedValueOnce([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 3, sheet_id: 'sheet3', parcel_id: 'parcel3' }
        ])

      const result = await validateLandParcelsRequest(landActions, mockRequest)
      expect(result).toBe('Land parcels not found: sheet2-parcel2')
    })

    test('should handle empty landActions array', async () => {
      const landActions = []

      const result = await validateLandParcelsRequest(landActions, mockRequest)
      expect(result).toBeNull()
      expect(getLandData).not.toHaveBeenCalled()
    })

    test('should handle database errors gracefully', async () => {
      const landActions = [{ sheetId: 'sheet1', parcelId: 'parcel1' }]

      getLandData.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        validateLandParcelsRequest(landActions, mockRequest)
      ).rejects.toThrow('Database connection failed')
    })
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

    test('should handle empty landActions array', async () => {
      const landActions = []
      const actions = [{ code: 'UPL1' }]

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
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
  })
})
