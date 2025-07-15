import { getAvailableAreaForAction } from './availableArea.js'
import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'

jest.mock('../api/land-cover-codes/queries/getLandCoversForAction.query.js')
jest.mock('../api/parcel/queries/getLandCoversForParcel.query.js')
jest.mock('../api/parcel/transformers/parcelActions.transformer.js')
jest.mock('./calculateAvailableArea.js')

const mockGetLandCoversForAction = getLandCoversForAction
const mockGetLandCoversForParcel = getLandCoversForParcel
const mockCalculateAvailableArea = calculateAvailableArea

describe('getAvailableAreaForAction', () => {
  const mockActionCode = 'CMOR1'

  const mockSheetId = 'SX0679'
  const mockParcelId = '9238'
  const mockCompatibilityCheckFn = jest.fn()
  const mockExistingActions = [{ actionCode: 'UPL1', areaSqm: 100 }]
  const mockPostgresDb = {
    query: jest.fn(),
    connect: jest.fn(),
    release: jest.fn()
  }
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }

  const mockLandCoverCodes = [
    { landCoverCode: '130', landCoverClassCode: '130' },
    { landCoverCode: '240', landCoverClassCode: '240' }
  ]

  const mockLandCoversForParcel = [
    { landCoverClassCode: '130', areaSqm: 3000 },
    { landCoverClassCode: '240', areaSqm: 2000 }
  ]
  const mockAvailableAreaResult = {
    stacks: [{ actionCode: 'CMOR1', areaSqm: 3000 }],
    explanations: ['Test explanation'],
    availableAreaSqm: 3000,
    totalValidLandCoverSqm: 5000,
    availableAreaHectares: 0.3
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetLandCoversForAction.mockResolvedValue(mockLandCoverCodes)
    mockGetLandCoversForParcel.mockResolvedValue(mockLandCoversForParcel)
    mockCalculateAvailableArea.mockReturnValue(mockAvailableAreaResult)
  })

  test('should return available area calculation result', async () => {
    const result = await getAvailableAreaForAction(
      mockActionCode,
      mockSheetId,
      mockParcelId,
      mockCompatibilityCheckFn,
      mockExistingActions,
      mockPostgresDb,
      mockLogger
    )

    expect(result).toEqual(mockAvailableAreaResult)

    expect(mockGetLandCoversForAction).toHaveBeenCalledWith(
      mockActionCode,
      mockPostgresDb,
      mockLogger
    )

    expect(mockCalculateAvailableArea).toHaveBeenCalledWith(
      mockExistingActions,
      mockActionCode,
      5000,
      mockCompatibilityCheckFn
    )
  })
})
