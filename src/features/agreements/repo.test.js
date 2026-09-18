import * as dal from '~/src/services/dal/index.js'
import * as db from '~/src/features/agreements/queries/getAgreementsForParcels.query.js'
import { getAgreements } from '~/src/features/agreements/repo.js'

vi.mock('~/src/features/agreements/queries/getAgreementsForParcels.query.js')
vi.mock('~/src/services/dal/index.js')

const sbi = '012345678'
const parcelId = '0001'
const sheetId = 'NY0001'
const fullParcelId = `${parcelId}-${sheetId}`
const token = 'dummy-defra-id-token'
const mockLogger = { info: vi.fn() }

// Default dates which are valid for today (with fake timer)
const startDate = new Date('2025-01-01')
const endDate = new Date('2027-01-01')

describe('getAgreements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch agreements from both the DB and the DAL', async () => {
    const parcels = [[parcelId, sheetId]]

    const dbAgreements = {
      [fullParcelId]: [
        {
          actionCode: 'UPL1',
          quantity: 100,
          unit: 'sqm',
          startDate,
          endDate
        },
        {
          actionCode: 'UPL2',
          quantity: 10000,
          unit: 'sqm',
          startDate,
          endDate
        }
      ]
    }
    const dalAgreements = {
      [fullParcelId]: [
        {
          actionCode: 'CMOR1',
          quantity: 15000,
          unit: 'sqm',
          startDate,
          endDate
        },
        {
          actionCode: 'CMOR2',
          quantity: 17000,
          unit: 'sqm',
          startDate,
          endDate
        }
      ]
    }

    db.getAgreementsForParcels.mockResolvedValue(dbAgreements)
    dal.getAgreements.mockResolvedValue(dalAgreements)

    const expected = {
      [fullParcelId]: [
        ...dbAgreements[fullParcelId],
        ...dalAgreements[fullParcelId]
      ]
    }

    const actual = await getAgreements(sbi, parcels, token, null, mockLogger)

    expect(actual).toEqual(expected)

    expect(db.getAgreementsForParcels).toHaveBeenCalledWith(
      [[parcelId, sheetId]],
      null,
      mockLogger
    )
    expect(dal.getAgreements).toHaveBeenCalledWith(sbi, token, mockLogger)
  })
})
