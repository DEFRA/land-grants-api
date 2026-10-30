import {
  calculateAvailableLength,
  getAvailableLength
} from './availableLength.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'
import { getSidednessByActionCode } from '../actions/queries/getSidednessByActionCode.query.js'
import {
  BOTH_SIDES,
  SINGLE_SIDE
} from '~/src/features/common/constants/sidedness.js'
import {
  LINEAR_SIDEDNESS,
  PARCEL_PERIMETER_METERS,
  compatibleOnly,
  existing,
  linearCompatibility,
  parcel
} from './testUtils.js'

vi.mock('../parcel/queries/getParcelBoundary.query.js')
vi.mock('../actions/queries/getSidednessByActionCode.query.js')

// An existing action as the explanation lists it
const explained = (
  actionCode,
  billedLengthMeters,
  { sidedness, occupiedMeters, deducted }
) => ({
  actionCode,
  billedLengthMeters,
  sidedness,
  occupiedMeters,
  deducted
})

describe('getAvailableLength', () => {
  // BND1 and BND2 are the linear actions that can be applied for; CMOR1 is
  // area-based. CHRW2 and WBD2 only reach a parcel as agreements
  const actions = [
    { code: 'BND1', applicationUnitOfMeasurement: 'm' },
    { code: 'BND2', applicationUnitOfMeasurement: 'm' },
    { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' }
  ]

  const landAction = {
    sheetId: 'SH123',
    parcelId: '9456',
    actions: []
  }

  const mockDb = {}
  const mockLogger = { info: vi.fn(), error: vi.fn() }

  // Answers as the query does, so a code it does not know is both-sides
  const readLinearSidedness = (codes) =>
    Promise.resolve(
      Object.fromEntries(
        codes.map((code) => [code, LINEAR_SIDEDNESS[code] ?? BOTH_SIDES])
      )
    )

  beforeEach(() => {
    vi.clearAllMocks()
    getLandParcelBoundary.mockResolvedValue({
      boundaryLengthMeters: PARCEL_PERIMETER_METERS
    })
    getSidednessByActionCode.mockImplementation(readLinearSidedness)
  })

  it('returns the full boundary length when there are no incompatible actions', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0,
      feasible: true,
      incompatibleActions: [],
      explainedOccupancies: []
    })
  })

  it('subtracts the length of incompatible sibling actions on the same parcel', async () => {
    const action = { code: 'BND2', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action, { code: 'BND1', quantity: 100 }] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND1', billedLengthMeters: 100 }
    ])
  })

  it('excludes the action itself from sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose unit of measurement is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action, { code: 'CMOR1', quantity: 100 }] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose code is not configured, since nothing says they compete for the boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action, { code: 'UNKNOWN', quantity: 100 }] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('subtracts the length of incompatible existing agreement actions', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [{ actionCode: 'BND2', quantity: 200, unit: 'm' }],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND2', billedLengthMeters: 200 }
    ])
  })

  it('excludes agreement actions whose unit is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [
        { actionCode: 'CMOR1', quantity: 15000, unit: 'sqm' },
        { actionCode: 'WBD1', quantity: 800, unit: 'count' }
      ],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('combines incompatible lengths from both agreements and sibling actions', async () => {
    // BND1 does not stack with itself, so the agreement and the sibling lie end to end
    const action = { code: 'BND2', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [{ actionCode: 'BND1', quantity: 200, unit: 'm' }],
      linearCompatibility,
      { ...landAction, actions: [action, { code: 'BND1', quantity: 100 }] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 1400,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300,
      feasible: true,
      incompatibleActions: [
        { actionCode: 'BND1', billedLengthMeters: 200 },
        { actionCode: 'BND1', billedLengthMeters: 100 }
      ],
      explainedOccupancies: [
        explained('BND1', 200, {
          sidedness: BOTH_SIDES,
          occupiedMeters: 200,
          deducted: true
        }),
        explained('BND1', 100, {
          sidedness: BOTH_SIDES,
          occupiedMeters: 100,
          deducted: true
        })
      ]
    })
  })

  it('rounds a fractional length up to the next whole metre', async () => {
    const action = { code: 'BND1', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      [{ actionCode: 'BND1', quantity: 200.4, unit: 'm' }],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 799,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 201,
      feasible: true,
      incompatibleActions: [{ actionCode: 'BND1', billedLengthMeters: 200.4 }],
      explainedOccupancies: [
        explained('BND1', 200.4, {
          sidedness: BOTH_SIDES,
          occupiedMeters: 201,
          deducted: true
        })
      ]
    })
  })

  it('reads the boundary of the parcel the action is applied for', async () => {
    const action = { code: 'BND1', quantity: 50 }

    await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(getLandParcelBoundary).toHaveBeenCalledTimes(1)
    expect(getLandParcelBoundary).toHaveBeenCalledWith(
      'SH123',
      '9456',
      mockDb,
      mockLogger
    )
  })

  it('returns zero available length when the parcel has no readable boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }
    getLandParcelBoundary.mockResolvedValue(null)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0,
      feasible: true,
      incompatibleActions: [],
      explainedOccupancies: []
    })
  })

  it('reports the incompatible length even when the boundary cannot be read', async () => {
    const action = { code: 'BND1', quantity: 50 }
    getLandParcelBoundary.mockResolvedValue(null)

    const result = await getAvailableLength(
      action,
      actions,
      [{ actionCode: 'BND1', quantity: 200, unit: 'm' }],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 200,
      feasible: false,
      incompatibleActions: [{ actionCode: 'BND1', billedLengthMeters: 200 }],
      explainedOccupancies: [
        explained('BND1', 200, {
          sidedness: BOTH_SIDES,
          occupiedMeters: 200,
          deducted: true
        })
      ]
    })
  })

  it('clamps the available length at zero when the incompatible length exceeds the boundary', async () => {
    const action = { code: 'BND2', quantity: 50 }

    const result = await getAvailableLength(
      action,
      actions,
      // Impossible with good data: BND1 is both-sides, so 1500 m needs 1500 m of a 1000 m boundary
      [{ actionCode: 'BND1', quantity: 1500, unit: 'm' }],
      linearCompatibility,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500,
      feasible: false,
      incompatibleActions: [{ actionCode: 'BND1', billedLengthMeters: 1500 }],
      explainedOccupancies: [
        explained('BND1', 1500, {
          sidedness: BOTH_SIDES,
          occupiedMeters: 1500,
          deducted: true
        })
      ]
    })
  })

  describe('sidedness', () => {
    it('reads sidedness once', async () => {
      const action = { code: 'BND1', quantity: 50 }

      await getAvailableLength(
        action,
        actions,
        [{ actionCode: 'CHRW2', quantity: 200, unit: 'm' }],
        linearCompatibility,
        { ...landAction, actions: [action, { code: 'BND2', quantity: 100 }] },
        mockDb,
        mockLogger
      )

      expect(getSidednessByActionCode).toHaveBeenCalledTimes(1)
    })

    it('reads the sidedness of the action applied for and of every action competing for the boundary', async () => {
      const action = { code: 'BND1', quantity: 50 }

      await getAvailableLength(
        action,
        actions,
        [{ actionCode: 'CHRW2', quantity: 200, unit: 'm' }],
        linearCompatibility,
        { ...landAction, actions: [action, { code: 'BND2', quantity: 100 }] },
        mockDb,
        mockLogger
      )

      const [requestedCodes, db, logger] =
        getSidednessByActionCode.mock.calls[0]

      expect({ codes: new Set(requestedCodes), db, logger }).toEqual({
        codes: new Set(['BND1', 'BND2', 'CHRW2']),
        db: mockDb,
        logger: mockLogger
      })
    })

    it('halves a single-side agreement against a both-sides action', async () => {
      const action = { code: 'BND1', quantity: 50 }

      const result = await getAvailableLength(
        action,
        actions,
        [{ actionCode: 'BND2', quantity: 1000, unit: 'm' }],
        linearCompatibility,
        { ...landAction, actions: [action] },
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        availableLength: 500,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 500,
        feasible: true,
        incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 1000 }],
        explainedOccupancies: [
          explained('BND2', 1000, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 500,
            deducted: true
          })
        ]
      })
    })

    it('fails rather than guessing when sidedness cannot be read', async () => {
      const action = { code: 'BND1', quantity: 50 }
      getSidednessByActionCode.mockRejectedValue(new Error('SELECT failed'))

      await expect(
        getAvailableLength(
          action,
          actions,
          [],
          linearCompatibility,
          { ...landAction, actions: [action] },
          mockDb,
          mockLogger
        )
      ).rejects.toThrow('SELECT failed')
    })
  })
})

describe('calculateAvailableLength', () => {
  describe('with nothing competing for the boundary', () => {
    it('offers a both-sides action the whole perimeter', () => {
      const result = calculateAvailableLength('BND1', [], parcel())

      expect(result).toEqual({
        availableLength: PARCEL_PERIMETER_METERS,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 0,
        feasible: true,
        incompatibleActions: [],
        explainedOccupancies: []
      })
    })

    it('offers a single-side action both faces of the whole perimeter', () => {
      const result = calculateAvailableLength('BND2', [], parcel())

      expect(result).toEqual({
        availableLength: 2 * PARCEL_PERIMETER_METERS,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 0,
        feasible: true,
        incompatibleActions: [],
        explainedOccupancies: []
      })
    })

    it('reports no available length on a parcel with no boundary', () => {
      const result = calculateAvailableLength(
        'BND2',
        [],
        parcel({ boundaryLengthMeters: 0 })
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: 0,
        incompatibleLengthMeters: 0,
        feasible: true,
        incompatibleActions: [],
        explainedOccupancies: []
      })
    })
  })

  describe('converting existing actions to the boundary they occupy', () => {
    it('halves a single-side existing action against a both-sides action', () => {
      const result = calculateAvailableLength(
        'BND1',
        [existing('BND2', 1000)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 500,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 500,
        feasible: true,
        incompatibleActions: [existing('BND2', 1000)],
        explainedOccupancies: [
          explained('BND2', 1000, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 500,
            deducted: true
          })
        ]
      })
    })

    it('deducts a both-sides existing action from both faces of a single-side action', () => {
      const result = calculateAvailableLength(
        'CHRW2',
        [existing('BND1', 300)],
        parcel({ boundaryLengthMeters: 800 })
      )

      expect(result).toEqual({
        availableLength: 1000,
        boundaryLengthMeters: 800,
        incompatibleLengthMeters: 300,
        feasible: true,
        incompatibleActions: [existing('BND1', 300)],
        explainedOccupancies: [
          explained('BND1', 300, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 300,
            deducted: true
          })
        ]
      })
    })

    it('fits a single-side existing action billed on both faces of the whole boundary', () => {
      const result = calculateAvailableLength(
        'BND1',
        [existing('BND2', 2 * PARCEL_PERIMETER_METERS)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: PARCEL_PERIMETER_METERS,
        feasible: true,
        incompatibleActions: [existing('BND2', 2 * PARCEL_PERIMETER_METERS)],
        explainedOccupancies: [
          explained('BND2', 2 * PARCEL_PERIMETER_METERS, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: PARCEL_PERIMETER_METERS,
            deducted: true
          })
        ]
      })
    })

    it('rounds an odd single-side length up to the next whole metre of boundary', () => {
      const result = calculateAvailableLength(
        'BND1',
        [existing('BND2', 1001)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 499,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 501,
        feasible: true,
        incompatibleActions: [existing('BND2', 1001)],
        explainedOccupancies: [
          explained('BND2', 1001, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 501,
            deducted: true
          })
        ]
      })
    })

    it('rounds the boundary each action occupies up before adding them', () => {
      // Two separate walls, such as an agreement and a sibling: BND1 does not stack with itself
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', 200.4), existing('BND1', 150.3)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 1296,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 352,
        feasible: true,
        incompatibleActions: [existing('BND1', 200.4), existing('BND1', 150.3)],
        explainedOccupancies: [
          explained('BND1', 200.4, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 201,
            deducted: true
          }),
          explained('BND1', 150.3, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 151,
            deducted: true
          })
        ]
      })
    })
  })

  describe('reading sidedness', () => {
    it('treats an action applied for with no sidedness as both-sides', () => {
      const result = calculateAvailableLength('HRW1', [], parcel())

      expect(result).toEqual({
        availableLength: PARCEL_PERIMETER_METERS,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 0,
        feasible: true,
        incompatibleActions: [],
        explainedOccupancies: []
      })
    })

    it('treats an existing action with no sidedness as both-sides', () => {
      const result = calculateAvailableLength(
        'BND1',
        [existing('HRW1', 400)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 600,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 400,
        feasible: true,
        incompatibleActions: [existing('HRW1', 400)],
        explainedOccupancies: [
          explained('HRW1', 400, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 400,
            deducted: true
          })
        ]
      })
    })
  })

  describe('compatibility', () => {
    it('does not deduct a compatible existing action', () => {
      const result = calculateAvailableLength(
        'BND2',
        [existing('CHRW2', 1200)],
        parcel({ boundaryLengthMeters: 600 })
      )

      expect(result).toEqual({
        availableLength: 1200,
        boundaryLengthMeters: 600,
        incompatibleLengthMeters: 0,
        feasible: true,
        incompatibleActions: [],
        explainedOccupancies: [
          explained('CHRW2', 1200, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 600,
            deducted: false
          })
        ]
      })
    })

    it('names only the incompatible actions it deducted', () => {
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', 200), existing('CHRW2', 100)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 1600,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 200,
        feasible: true,
        incompatibleActions: [existing('BND1', 200)],
        explainedOccupancies: [
          explained('BND1', 200, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 200,
            deducted: true
          }),
          explained('CHRW2', 100, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 50,
            deducted: false
          })
        ]
      })
    })
  })

  describe('arranging existing actions on the boundary', () => {
    it('deducts existing actions that stack with each other once', () => {
      // A hedge on a hedgebank: both lie along the same 750 m, and BND1 can share neither
      const result = calculateAvailableLength(
        'BND1',
        [existing('BND2', 1500), existing('CHRW2', 1500)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 250,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 750,
        feasible: true,
        incompatibleActions: [existing('BND2', 1500)],
        explainedOccupancies: [
          explained('BND2', 1500, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 750,
            deducted: true
          }),
          explained('CHRW2', 1500, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 750,
            deducted: false
          })
        ]
      })
    })

    it('marks the equally heavy group whose first member comes earliest as deducted', () => {
      // The same two actions as above in the other order, so CHRW2 is marked rather than BND2
      const result = calculateAvailableLength(
        'BND1',
        [existing('CHRW2', 1500), existing('BND2', 1500)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 250,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 750,
        feasible: true,
        incompatibleActions: [existing('CHRW2', 1500)],
        explainedOccupancies: [
          explained('CHRW2', 1500, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 750,
            deducted: true
          }),
          explained('BND2', 1500, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 750,
            deducted: false
          })
        ]
      })
    })

    it('adds up existing actions that are incompatible with each other', () => {
      // HRW1 has no sidedness and stacks with nothing, so it sits beside BND1
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', 200), existing('HRW1', 150)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 1300,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 350,
        feasible: true,
        incompatibleActions: [existing('BND1', 200), existing('HRW1', 150)],
        explainedOccupancies: [
          explained('BND1', 200, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 200,
            deducted: true
          }),
          explained('HRW1', 150, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 150,
            deducted: true
          })
        ]
      })
    })

    it('adds up two entries for the same code', () => {
      // An agreement and a sibling: BND1 does not stack with itself
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', 300), existing('BND1', 200)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 1000,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 500,
        feasible: true,
        incompatibleActions: [existing('BND1', 300), existing('BND1', 200)],
        explainedOccupancies: [
          explained('BND1', 300, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 300,
            deducted: true
          }),
          explained('BND1', 200, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 200,
            deducted: true
          })
        ]
      })
    })

    it('does not let the action applied for inherit compatibility through another action', () => {
      // A stacks with B and B with C, but A does not stack with C, so C still takes its 600 m
      const result = calculateAvailableLength(
        'A',
        [existing('B', 600), existing('C', 600)],
        parcel({
          compatibilityCheckFn: compatibleOnly(['A', 'B'], ['B', 'C']),
          sidednessByActionCode: {}
        })
      )

      expect(result).toEqual({
        availableLength: 400,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 600,
        feasible: true,
        incompatibleActions: [existing('C', 600)],
        explainedOccupancies: [
          explained('B', 600, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 600,
            deducted: false
          }),
          explained('C', 600, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 600,
            deducted: true
          })
        ]
      })
    })
  })

  describe('explaining the result', () => {
    it('lists each existing action with the boundary it occupies and whether it was deducted', () => {
      const result = calculateAvailableLength(
        'BND2',
        [existing('CHRW2', 400), existing('BND1', 200)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 1600,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 200,
        feasible: true,
        incompatibleActions: [existing('BND1', 200)],
        explainedOccupancies: [
          explained('CHRW2', 400, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 200,
            deducted: false
          }),
          explained('BND1', 200, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 200,
            deducted: true
          })
        ]
      })
    })
  })

  describe('when existing actions do not fit the boundary', () => {
    it('clamps the available length at zero and reports the boundary as exceeded', () => {
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', 1200)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 1200,
        feasible: false,
        incompatibleActions: [existing('BND1', 1200)],
        explainedOccupancies: [
          explained('BND1', 1200, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 1200,
            deducted: true
          })
        ]
      })
    })

    it('does not count a boundary filled exactly as exceeded', () => {
      const result = calculateAvailableLength(
        'BND2',
        [existing('BND1', PARCEL_PERIMETER_METERS)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: PARCEL_PERIMETER_METERS,
        feasible: true,
        incompatibleActions: [existing('BND1', PARCEL_PERIMETER_METERS)],
        explainedOccupancies: [
          explained('BND1', PARCEL_PERIMETER_METERS, {
            sidedness: BOTH_SIDES,
            occupiedMeters: PARCEL_PERIMETER_METERS,
            deducted: true
          })
        ]
      })
    })

    it('is not feasible when existing actions cannot fit, even if each stacks with the action applied for', () => {
      // Two WBD2 agreements cannot share a stretch, and need 1100 m of a 1000 m boundary
      const result = calculateAvailableLength(
        'BND2',
        [existing('WBD2', 600), existing('WBD2', 500)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 1100,
        feasible: false,
        incompatibleActions: [existing('WBD2', 600), existing('WBD2', 500)],
        explainedOccupancies: [
          explained('WBD2', 600, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 600,
            deducted: true
          }),
          explained('WBD2', 500, {
            sidedness: BOTH_SIDES,
            occupiedMeters: 500,
            deducted: true
          })
        ]
      })
    })

    it('is not feasible when any existing action is on a parcel with no boundary', () => {
      // The validation path passes 0 for a boundary it cannot read
      const result = calculateAvailableLength(
        'BND2',
        [existing('CHRW2', 100)],
        parcel({ boundaryLengthMeters: 0 })
      )

      expect(result).toEqual({
        availableLength: 0,
        boundaryLengthMeters: 0,
        incompatibleLengthMeters: 50,
        feasible: false,
        incompatibleActions: [existing('CHRW2', 100)],
        explainedOccupancies: [
          explained('CHRW2', 100, {
            sidedness: SINGLE_SIDE,
            occupiedMeters: 50,
            deducted: true
          })
        ]
      })
    })
  })

  // Each test filters for the cases that break its rule, and expects there to be none
  describe('invariants', () => {
    const LINEAR_CODES = ['BND1', 'BND2', 'CHRW2', 'WBD2']

    const expectedBillingFactor = (code) =>
      LINEAR_SIDEDNESS[code] === SINGLE_SIDE ? 2 : 1

    // A fixed linear congruential sequence, so every run checks the same cases
    const sequence = (seed) => {
      let state = seed
      return (bound) => {
        state = (state * 1103515245 + 12345) % 2 ** 31
        return state % bound
      }
    }

    const generateCases = (count) => {
      const next = sequence(1)
      return Array.from({ length: count }, () => ({
        targetCode: LINEAR_CODES[next(LINEAR_CODES.length)],
        boundaryLengthMeters: next(2001),
        existingActions: Array.from({ length: next(5) }, () =>
          existing(LINEAR_CODES[next(LINEAR_CODES.length)], next(2501))
        )
      }))
    }

    const CASES = generateCases(500)

    const calculate = ({ targetCode, existingActions, boundaryLengthMeters }) =>
      calculateAvailableLength(targetCode, existingActions, {
        compatibilityCheckFn: linearCompatibility,
        boundaryLengthMeters,
        sidednessByActionCode: LINEAR_SIDEDNESS
      })

    // Same actions in the same order
    const sameActions = (actual, expected) =>
      JSON.stringify(actual) === JSON.stringify(expected)

    it('never offers less than zero or more than the whole boundary in the action’s own units', () => {
      const violations = CASES.filter((testCase) => {
        const { availableLength } = calculate(testCase)

        const ceiling =
          testCase.boundaryLengthMeters *
          expectedBillingFactor(testCase.targetCode)

        return availableLength < 0 || availableLength > ceiling
      })

      expect(violations).toEqual([])
    })

    it('always offers whole metres, a multiple of the action’s billing factor', () => {
      const violations = CASES.filter((testCase) => {
        const { availableLength } = calculate(testCase)

        return (
          !Number.isInteger(availableLength) ||
          // Free boundary is whole metres, so a single-side figure is always even
          availableLength % expectedBillingFactor(testCase.targetCode) !== 0
        )
      })

      expect(violations).toEqual([])
    })

    it('gives the same result whatever order the existing actions come in', () => {
      const violations = CASES.filter((testCase) => {
        const testCaseReversed = {
          ...testCase,
          existingActions: [...testCase.existingActions].reverse()
        }

        const original = calculate(testCase)
        const withReversed = calculate(testCaseReversed)

        // Which of two equally heavy groups is named can change, so compare the figures
        return (
          original.availableLength !== withReversed.availableLength ||
          original.feasible !== withReversed.feasible
        )
      })

      expect(violations).toEqual([])
    })

    // Less or the same, never more: a boundary already full or overflowing stays at 0
    it('never offers more after another existing action is added', () => {
      // BND1 stacks with nothing, so it competes for the boundary whatever the target
      const extra = existing('BND1', 150)

      const violations = CASES.filter((testCase) => {
        const testCaseWithExtra = {
          ...testCase,
          existingActions: [...testCase.existingActions, extra]
        }

        const original = calculate(testCase)
        const withExtra = calculate(testCaseWithExtra)

        return original.availableLength < withExtra.availableLength
      })

      expect(violations).toEqual([])
    })

    // A compatible action stacks with the one applied for, so it takes nothing from it
    it('offers the same after adding an action compatible with the one applied for, while the actions still fit', () => {
      const violations = CASES.filter((testCase) => {
        const compatibleCode = LINEAR_CODES.find((code) =>
          linearCompatibility(code, testCase.targetCode)
        )

        if (!compatibleCode) {
          return false // Must be BND1, which stacks with nothing, so the rule has nothing to check
        }

        const compatibleAction = existing(compatibleCode, 300)

        const testCaseWithCompatible = {
          ...testCase,
          existingActions: [...testCase.existingActions, compatibleAction]
        }

        const original = calculate(testCase)
        const withCompatible = calculate(testCaseWithCompatible)

        const lengthChanged =
          original.availableLength !== withCompatible.availableLength
        // Existing actions that no longer fit make the result 0 whatever stacks with what
        const stillFits = withCompatible.feasible

        return stillFits && lengthChanged
      })

      expect(violations).toEqual([])
    })

    // Stacking can only save boundary, so the deduction lies between these two
    it('deducts at least the longest incompatible action and at most all of them added up, while the actions fit', () => {
      const violations = CASES.filter((testCase) => {
        const result = calculate(testCase)

        const occupiedByIncompatible = result.explainedOccupancies
          .filter(
            ({ actionCode }) =>
              !linearCompatibility(actionCode, testCase.targetCode)
          )
          .map(({ occupiedMeters }) => occupiedMeters)

        const longest = Math.max(0, ...occupiedByIncompatible)
        const addedUp = occupiedByIncompatible.reduce(
          (sum, meters) => sum + meters,
          0
        )

        const outOfRange =
          result.incompatibleLengthMeters < longest ||
          result.incompatibleLengthMeters > addedUp

        return result.feasible && outOfRange
      })

      expect(violations).toEqual([])
    })

    it('never deducts more than the boundary while the actions fit', () => {
      const violations = CASES.filter((testCase) => {
        const result = calculate(testCase)

        return (
          result.feasible &&
          result.incompatibleLengthMeters > testCase.boundaryLengthMeters
        )
      })

      expect(violations).toEqual([])
    })

    it('explains every existing action once, in the order given', () => {
      const violations = CASES.filter((testCase) => {
        const result = calculate(testCase)

        const explainedActions = result.explainedOccupancies.map(
          ({ actionCode, billedLengthMeters }) =>
            existing(actionCode, billedLengthMeters)
        )

        return !sameActions(explainedActions, testCase.existingActions)
      })

      expect(violations).toEqual([])
    })

    it('marks as deducted exactly the actions it names', () => {
      const violations = CASES.filter((testCase) => {
        const result = calculate(testCase)

        const markedDeducted = result.explainedOccupancies
          .filter(({ deducted }) => deducted)
          .map(({ actionCode, billedLengthMeters }) =>
            existing(actionCode, billedLengthMeters)
          )

        return !sameActions(markedDeducted, result.incompatibleActions)
      })

      expect(violations).toEqual([])
    })
  })
})
