import { vi, describe, test, beforeEach, expect } from 'vitest'
import { validateRequest } from './application.validation.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')

const upl1 = { code: 'UPL1', applicationUnitOfMeasurement: 'ha' }
const upl2 = { code: 'UPL2', applicationUnitOfMeasurement: 'ha' }
const cmor1 = { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' }
const wbd1 = { code: 'WBD1', applicationUnitOfMeasurement: 'count' }
const hef1 = { code: 'HEF1', applicationUnitOfMeasurement: 'sqm' }
const bnd1 = { code: 'BND1', applicationUnitOfMeasurement: 'm' }

const actions = [upl1, upl2, cmor1, wbd1, hef1, bnd1]

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

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should return empty array when action quantities are an integer', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [
            { code: 'WBD1', quantity: 3 },
            { code: 'WBD1', quantity: 3.0 }
          ]
        }
      ]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    it.each([['HEF1'], ['WBD1'], ['BND1']])(
      'should return an error for non-integer quantity for action %s',
      async (code) => {
        const landActions = [
          {
            sheetId: 'sheet1',
            parcelId: 'parcel1',
            actions: [{ code, quantity: 2.5 }]
          }
        ]

        getLandData.mockResolvedValue([
          { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
        ])

        const result = await validateRequest(landActions, actions, mockRequest)
        expect(result).toHaveLength(1)
      }
    )

    test('should allow non-whole number quantities for hectare actions', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1', quantity: 2.5 }]
        }
      ]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should return non-integer error for multiple invalid quantities', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [
            { code: 'WBD1', quantity: 2.5 },
            { code: 'HEF1', quantity: 3.75 }
          ]
        }
      ]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toHaveLength(1)
    })

    test('should return both non-integer and actions errors when both validations fail', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [
            { code: 'WBD1', quantity: 2.5 },
            { code: 'INVALID_ACTION', quantity: 1 }
          ]
        }
      ]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toHaveLength(2)
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

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, [], mockRequest)
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

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      const result = await validateRequest(landActions, actions, mockRequest)
      expect(result).toEqual([])
    })

    test('should handle null/undefined landActions', async () => {
      const landActions = null

      await expect(
        validateRequest(landActions, actions, mockRequest)
      ).rejects.toThrow()
    })

    test('should handle null actions', async () => {
      const landActions = [
        {
          sheetId: 'sheet1',
          parcelId: 'parcel1',
          actions: [{ code: 'UPL1' }]
        }
      ]

      getLandData.mockResolvedValue([
        { id: 1, sheet_id: 'sheet1', parcel_id: 'parcel1' }
      ])

      await expect(
        validateRequest(landActions, null, mockRequest)
      ).rejects.toThrow()
    })

    test('should propagate database errors from parcel lookup', async () => {
      const landActions = [
        { sheetId: 'sheet1', parcelId: 'parcel1', actions: [] }
      ]

      getLandData.mockRejectedValueOnce(new Error('Database connection failed'))

      await expect(
        validateRequest(landActions, actions, mockRequest)
      ).rejects.toThrow('Database connection failed')
    })
  })
})
