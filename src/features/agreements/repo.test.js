import * as dal from '~/src/services/dal/index.js'
import * as db from '~/src/features/agreements/queries/getAgreementsForParcel.query.js'
import { getAgreements } from '~/src/features/agreements/repo.js'

vi.mock('~/src/features/agreements/queries/getAgreementsForParcel.query.js')
vi.mock('~/src/services/dal/index.js')

const mockLogger = { info: vi.fn() }

describe('getAgreements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch agreements from both the DB and the DAL', async () => {
    const sbi = '012345678'
    const sheetId = 'dummy-sheet'
    const parcelId = 'dummy-parcel'
    const token = 'dummy-defra-id-token'

    const dbAgreements = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      },
      {
        actionCode: 'UPL2',
        quantity: 10000,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      }
    ]
    const dalAgreements = [
      {
        actionCode: 'CMOR1',
        quantity: 15000,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      },
      {
        actionCode: 'CMOR2',
        quantity: 17000,
        unit: 'sqm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      }
    ]

    db.getAgreementsForParcel.mockResolvedValue(dbAgreements)
    dal.getAgreements.mockResolvedValue(dalAgreements)

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    )

    expect(db.getAgreementsForParcel).toHaveBeenCalledWith(
      sheetId,
      parcelId,
      null,
      mockLogger
    )
    expect(dal.getAgreements).toHaveBeenCalledWith(
      sbi,
      parcelId,
      sheetId,
      token,
      mockLogger
    )

    expect(result).toEqual([...dbAgreements, ...dalAgreements])
  })

  it('should filter out non-area agreements', async () => {
    const sbi = '012345678'
    const sheetId = 'dummy-sheet'
    const parcelId = 'dummy-parcel'
    const token = 'dummy-defra-id-token'

    const dbAgreementCount = {
      actionCode: 'AF1',
      quantity: 800,
      unit: 'count',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-11-31')
    }

    const dbAgreementArea = {
      actionCode: 'UPL1',
      quantity: 100,
      unit: 'sqm',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-11-31')
    }

    const dalAgreementLength = {
      actionCode: 'SPM4',
      quantity: 200,
      unit: 'm',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-11-31')
    }
    const dalAgreementArea = {
      actionCode: 'CMOR1',
      quantity: 15000,
      unit: 'sqm',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-11-31')
    }

    db.getAgreementsForParcel.mockResolvedValue([
      dbAgreementCount,
      dbAgreementArea
    ])
    dal.getAgreements.mockResolvedValue([dalAgreementLength, dalAgreementArea])

    const result = await getAgreements(
      sbi,
      sheetId,
      parcelId,
      token,
      null,
      mockLogger
    )

    expect(db.getAgreementsForParcel).toHaveBeenCalledWith(
      sheetId,
      parcelId,
      null,
      mockLogger
    )
    expect(dal.getAgreements).toHaveBeenCalledWith(
      sbi,
      parcelId,
      sheetId,
      token,
      mockLogger
    )

    expect(result).toEqual([dbAgreementArea, dalAgreementArea])
  })
})
