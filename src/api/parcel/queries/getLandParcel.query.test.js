import { getLandParcel } from '~/src/api/parcel/queries/getLandParcel.query.js'
import landParcelModel from '~/src/api/parcel/models/parcel.model.js'
import { mockParcel } from '~/src/api/parcel/fixtures/index.js'
jest.mock('~/src/api/parcel/models/parcel.model.js')

describe('getLandParcel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return a land parcel when found', async () => {
    const query = {
      lean: jest.fn().mockResolvedValue(mockParcel)
    }
    landParcelModel.findOne.mockReturnValue(query)

    const result = await getLandParcel('SX0679', '9238')

    expect(landParcelModel.findOne).toHaveBeenCalledWith({
      sheetId: 'SX0679',
      parcelId: '9238'
    })
    expect(result).toEqual(mockParcel)
  })

  it('should return null when no land parcel is found', async () => {
    const query = {
      lean: jest.fn().mockResolvedValue(null)
    }
    landParcelModel.findOne.mockReturnValue(query)

    const result = await getLandParcel('1', '2')

    expect(landParcelModel.findOne).toHaveBeenCalledWith({
      sheetId: '1',
      parcelId: '2'
    })
    expect(result).toBeNull()
  })

  it('should return null when an error occurs', async () => {
    const query = {
      lean: jest.fn().mockRejectedValue(new Error('Database error'))
    }
    landParcelModel.findOne.mockReturnValue(query)

    const result = await getLandParcel('SX0679', '9238')

    expect(landParcelModel.findOne).toHaveBeenCalledWith({
      sheetId: 'SX0679',
      parcelId: '9238'
    })
    expect(result).toBeNull()
  })
})
