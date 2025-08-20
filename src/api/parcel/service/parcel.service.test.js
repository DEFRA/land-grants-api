import {
  mergeActionsAndCurrentAgreements,
  splitParcelId,
  getParcelActionsWithAvailableArea
} from './parcel.service.js'
import { getEnabledActions } from '~/src/api/actions/queries/index.js'

jest.mock(
  '~/src/api/agreements/queries/getAgreementsForParcel.query.js',
  () => ({
    getAgreementsForParcel: jest.fn().mockResolvedValue([
      {
        actionCode: 'UPL1',
        quantity: 1,
        unit: 'ha'
      }
    ])
  })
)

jest.mock('~/src/api/actions/queries/index.js', () => ({
  getEnabledActions: jest.fn().mockResolvedValue()
}))

jest.mock('~/src/available-area/availableArea.js', () => ({
  getAvailableAreaDataRequirements: jest.fn(),
  getAvailableAreaForAction: jest.fn().mockReturnValue({
    stacks: [],
    explanations: [],
    availableAreaSqm: 3000,
    totalValidLandCoverSqm: 2600,
    availableAreaHectares: 3.2
  })
}))

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn()
}

describe('Parcel Service', () => {
  const mockLogger = {
    error: jest.fn()
  }

  describe('splitParcelId', () => {
    test('should split valid parcel id into sheetId and parcelId', () => {
      const result = splitParcelId('SX0679-9238', mockLogger)
      expect(result).toEqual({
        sheetId: 'SX0679',
        parcelId: '9238'
      })
    })

    test('should throw error for invalid input', () => {
      expect(() => splitParcelId('SX0679-', mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })

    test('should throw error for empty input', () => {
      expect(() => splitParcelId(null, mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })
  })
})

describe('getParcelActionsWithAvailableArea', () => {
  it('should throw when no enabled actions', async () => {
    getEnabledActions.mockResolvedValue([])

    await expect(getParcelActionsWithAvailableArea()).rejects.toEqual(
      Error('Actions not found')
    )
  })

  it('should return actions with available area', async () => {
    getEnabledActions.mockResolvedValue([
      {
        display: true,
        code: 'CMOR1',
        description: 'action description',
        quantity: 3.2
      }
    ])

    const result = await getParcelActionsWithAvailableArea(
      'SD1',
      '123',
      [],
      true,
      {},
      logger
    )

    expect(result).toEqual([
      {
        availableArea: {
          unit: 'ha',
          value: 3.2
        },
        code: 'CMOR1',
        description: 'action description',
        results: {
          explanations: [],
          stacks: [],
          totalValidLandCoverSqm: 2600
        }
      }
    ])
  })
})

describe('mergeActionsAndCurrentAgreements', () => {
  it('should return merged actions', async () => {
    const result = await mergeActionsAndCurrentAgreements(
      'SD1',
      '1234',
      [
        {
          actionCode: 'CMOR1',
          quantity: 2,
          unit: 'ha'
        }
      ],
      {},
      { info: jest.fn() }
    )

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 1,
        unit: 'ha'
      },
      {
        actionCode: 'CMOR1',
        quantity: 2,
        unit: 'ha'
      }
    ])
  })
})
