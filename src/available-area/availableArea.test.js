import { getAvailableAreaForAction } from './availableArea.js'
import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'

jest.mock('../api/land-cover-codes/queries/getLandCoversForAction.query.js')
jest.mock('../api/parcel/queries/getParcelAvailableArea.query.js')
jest.mock('../api/parcel/transformers/parcelActions.transformer.js')
jest.mock('./calculateAvailableArea.js')

const mockGetLandCoversForAction = getLandCoversForAction
const mockGetParcelAvailableArea = getParcelAvailableArea
const mockCalculateAvailableArea = calculateAvailableArea

describe('getAvailableAreaForAction', () => {
  const mockAction = {
    code: 'CMOR1',
    landCoverClassCodes: ['130', '240']
  }

  const mockSheetId = 'SX0679'
  const mockParcelId = '9238'
  const mockCompatibilityCheckFn = jest.fn()
  const mockExistingActions = [{ code: 'UPL1', quantity: 100 }]
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
    { land_cover_code: '130', land_cover_class_code: '130' },
    { land_cover_code: '240', land_cover_class_code: '240' }
  ]

  const mockTotalValidLandCoverSqm = 5000
  const mockAvailableAreaResult = {
    stacks: [{ code: 'CMOR1', quantity: 3000 }],
    explanations: ['Test explanation'],
    availableAreaSqm: 3000,
    totalValidLandCoverSqm: 5000,
    availableAreaHectares: 0.3
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockGetLandCoversForAction.mockResolvedValue(mockLandCoverCodes)
    mockGetParcelAvailableArea.mockResolvedValue(mockTotalValidLandCoverSqm)
    mockCalculateAvailableArea.mockReturnValue(mockAvailableAreaResult)
  })

  test('should return available area calculation result', async () => {
    const result = await getAvailableAreaForAction(
      mockAction,
      mockSheetId,
      mockParcelId,
      mockCompatibilityCheckFn,
      mockExistingActions,
      mockPostgresDb,
      mockLogger
    )

    expect(result).toEqual(mockAvailableAreaResult)

    expect(mockGetLandCoversForAction).toHaveBeenCalledWith(
      mockAction.code,
      mockPostgresDb,
      mockLogger
    )
    expect(mockGetParcelAvailableArea).toHaveBeenCalledWith(
      mockSheetId,
      mockParcelId,
      mergeLandCoverCodes(mockLandCoverCodes),
      mockPostgresDb,
      mockLogger
    )
    expect(mockCalculateAvailableArea).toHaveBeenCalledWith(
      mockExistingActions,
      { code: mockAction.code },
      mockTotalValidLandCoverSqm,
      mockCompatibilityCheckFn
    )
  })
})
