import * as fx from '~/src/services/dal/fixtures/business.js'
import { getAgreementsForParcels } from './getAgreementsForParcels.query.js'

const defaultDbFields = {
  id: 1,
  parcel_id: fx.PARCEL_ID,
  sheet_id: fx.SHEET_ID,
  ingest_id: 1337,
  ingest_date: '2020-01-01T00:00:00Z',
  actions: []
}

describe('getAgreementsForParcels', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    }

    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  test('should connect to the database', async () => {
    await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should return the transformed query results', async () => {
    mockClient.query = vi.fn().mockResolvedValue({
      rows: [
        {
          ...defaultDbFields,
          actions: [
            {
              actionCode: 'UPL1',
              unit: 'ha',
              quantity: 0.5,
              startDate: '2025-01-01',
              endDate: '2025-12-31'
            },
            {
              actionCode: 'CMOR1',
              unit: 'ha',
              quantity: 1.2,
              startDate: '2025-01-01',
              endDate: '2025-12-31'
            }
          ]
        }
      ]
    })

    const result = await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      '0001-NY0001': [
        {
          actionCode: 'UPL1',
          unit: 'ha',
          quantity: 0.5,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31')
        },
        {
          actionCode: 'CMOR1',
          unit: 'ha',
          quantity: 1.2,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31')
        }
      ]
    })
  })

  test('should return an empty object when no agreements found', async () => {
    mockClient.query = vi.fn().mockResolvedValue({ rows: [] })

    const result = await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(result).toEqual({})
  })

  test('should release the client when done', async () => {
    await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  // TODO: Is this really desired behaviour? We're squashing an error here
  test('should handle errors and return an empty object', async () => {
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(result).toEqual({})
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.connect = vi.fn().mockRejectedValue(connectionError)

    const result = await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(result).toEqual({})

    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle client release if client is not defined', async () => {
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getAgreementsForParcels(
      [[fx.PARCEL_ID, fx.SHEET_ID]],
      mockDb,
      mockLogger
    )

    expect(result).toEqual({})
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
