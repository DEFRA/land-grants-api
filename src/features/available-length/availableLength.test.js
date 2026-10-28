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

vi.mock('../parcel/queries/getParcelBoundary.query.js')
vi.mock('../actions/queries/getSidednessByActionCode.query.js')

const PARCEL_PERIMETER_METERS = 1000

// Every requested code as both-sides, which is what a code with no sidedness resolves to
const resolveAllAsBothSides = (codes) =>
  Promise.resolve(Object.fromEntries(codes.map((code) => [code, BOTH_SIDES])))

describe('getAvailableLength', () => {
  // BND1, BND2 and ACT2 are linear actions measured in metres; CMOR1 is area-based
  const actions = [
    { code: 'BND1', applicationUnitOfMeasurement: 'm' },
    { code: 'BND2', applicationUnitOfMeasurement: 'm' },
    { code: 'ACT2', applicationUnitOfMeasurement: 'm' },
    { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' }
  ]

  const landAction = {
    sheetId: 'SH123',
    parcelId: '9456',
    actions: []
  }

  const compatibilityCheckFn = vi.fn()
  const mockDb = {}
  const mockLogger = { info: vi.fn(), error: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    getLandParcelBoundary.mockResolvedValue({
      boundaryLengthMeters: PARCEL_PERIMETER_METERS
    })
    getSidednessByActionCode.mockImplementation(resolveAllAsBothSides)
  })

  it('returns the full boundary length when there are no incompatible actions', async () => {
    const action = { code: '', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: PARCEL_PERIMETER_METERS,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 0,
      exceedsBoundary: false,
      incompatibleActions: []
    })
  })

  it('subtracts the length of incompatible sibling actions on the same parcel', async () => {
    const action = { code: 'CHRW2', quantity: 50 }
    const sibling = { code: 'BND1', quantity: 100 }
    compatibilityCheckFn.mockImplementation(
      (code, otherCode) => code !== sibling.code && otherCode !== sibling.code
    )

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([
      { actionCode: 'BND1', billedLengthMeters: 100 }
    ])
  })

  it('excludes the action itself from sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose unit of measurement is not meters', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const nonLengthSibling = { code: 'CMOR1', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, nonLengthSibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('excludes sibling actions whose code is not configured, since nothing says they compete for the boundary', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const unknownSibling = { code: 'UNKNOWN', quantity: 100 }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
      { ...landAction, actions: [action, unknownSibling] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('subtracts the length of incompatible existing agreement actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockImplementation(
      (code, otherCode) =>
        code !== agreement.actionCode && otherCode !== agreement.actionCode
    )

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
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
    const areaAgreement = { actionCode: 'CMOR1', quantity: 15000, unit: 'sqm' }
    const countAgreement = { actionCode: 'WBD1', quantity: 800, unit: 'count' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [areaAgreement, countAgreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result.incompatibleActions).toEqual([])
  })

  it('combines incompatible lengths from both agreements and sibling actions', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const sibling = { code: 'BND2', quantity: 100 }
    const agreement = { actionCode: 'CHRW2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action, sibling] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 700,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 300,
      exceedsBoundary: false,
      incompatibleActions: [
        { actionCode: 'CHRW2', billedLengthMeters: 200 },
        { actionCode: 'BND2', billedLengthMeters: 100 }
      ]
    })
  })

  it('rounds a fractional length up to the next whole metre', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200.4, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 799,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 201,
      exceedsBoundary: false,
      incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 200.4 }]
    })
  })

  it('reads the boundary of the parcel the action is applied for', async () => {
    const action = { code: 'BND1', quantity: 50 }

    await getAvailableLength(
      action,
      actions,
      [],
      compatibilityCheckFn,
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
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 0,
      exceedsBoundary: false,
      incompatibleActions: []
    })
  })

  it('reports the incompatible length even when the boundary cannot be read', async () => {
    const action = { code: 'BND1', quantity: 50 }
    const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)
    getLandParcelBoundary.mockResolvedValue(null)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: 0,
      incompatibleLengthMeters: 200,
      exceedsBoundary: true,
      incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 200 }]
    })
  })

  it('clamps the available length at zero when the incompatible length exceeds the boundary', async () => {
    const action = { code: 'BND2', quantity: 50 }
    // Impossible with good data: BND1 is both-sides, so 1500 m needs 1500 m of a 1000 m boundary
    const agreement = { actionCode: 'BND1', quantity: 1500, unit: 'm' }
    compatibilityCheckFn.mockReturnValue(false)

    const result = await getAvailableLength(
      action,
      actions,
      [agreement],
      compatibilityCheckFn,
      { ...landAction, actions: [action] },
      mockDb,
      mockLogger
    )

    expect(result).toEqual({
      availableLength: 0,
      boundaryLengthMeters: PARCEL_PERIMETER_METERS,
      incompatibleLengthMeters: 1500,
      exceedsBoundary: true,
      incompatibleActions: [{ actionCode: 'BND1', billedLengthMeters: 1500 }]
    })
  })

  describe('sidedness', () => {
    it('reads sidedness once', async () => {
      const action = { code: 'BND1', quantity: 50 }
      const sibling = { code: 'ACT2', quantity: 100 }
      const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }

      await getAvailableLength(
        action,
        actions,
        [agreement],
        compatibilityCheckFn,
        { ...landAction, actions: [action, sibling] },
        mockDb,
        mockLogger
      )

      expect(getSidednessByActionCode).toHaveBeenCalledTimes(1)
    })

    it('reads the sidedness of the action applied for and of every action competing for the boundary', async () => {
      const action = { code: 'BND1', quantity: 50 }
      const sibling = { code: 'ACT2', quantity: 100 }
      const agreement = { actionCode: 'BND2', quantity: 200, unit: 'm' }

      await getAvailableLength(
        action,
        actions,
        [agreement],
        compatibilityCheckFn,
        { ...landAction, actions: [action, sibling] },
        mockDb,
        mockLogger
      )

      const [requestedCodes, db, logger] =
        getSidednessByActionCode.mock.calls[0]

      expect({ codes: new Set(requestedCodes), db, logger }).toEqual({
        codes: new Set(['BND1', 'ACT2', 'BND2']),
        db: mockDb,
        logger: mockLogger
      })
    })

    it('halves a single-side agreement against a both-sides action', async () => {
      const action = { code: 'BND1', quantity: 50 }
      const agreement = { actionCode: 'BND2', quantity: 1000, unit: 'm' }
      compatibilityCheckFn.mockReturnValue(false)
      getSidednessByActionCode.mockResolvedValue({
        BND1: BOTH_SIDES,
        BND2: SINGLE_SIDE
      })

      const result = await getAvailableLength(
        action,
        actions,
        [agreement],
        compatibilityCheckFn,
        { ...landAction, actions: [action] },
        mockDb,
        mockLogger
      )

      expect(result).toEqual({
        availableLength: 500,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 500,
        exceedsBoundary: false,
        incompatibleActions: [{ actionCode: 'BND2', billedLengthMeters: 1000 }]
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
          compatibilityCheckFn,
          { ...landAction, actions: [action] },
          mockDb,
          mockLogger
        )
      ).rejects.toThrow('SELECT failed')
    })
  })
})

describe('calculateAvailableLength', () => {
  // The linear actions as configured: BND2, CHRW2 and WBD2 stack with each
  // other; BND1 stacks with nothing; no action stacks with itself
  const LINEAR_SIDEDNESS = {
    BND1: BOTH_SIDES,
    BND2: SINGLE_SIDE,
    CHRW2: SINGLE_SIDE,
    WBD2: BOTH_SIDES
  }

  const STACKING_CODES = new Set(['BND2', 'CHRW2', 'WBD2'])

  const linearCompatibility = (code, otherCode) =>
    code !== otherCode &&
    STACKING_CODES.has(code) &&
    STACKING_CODES.has(otherCode)

  const parcel = (overrides = {}) => ({
    compatibilityCheckFn: linearCompatibility,
    boundaryLengthMeters: PARCEL_PERIMETER_METERS,
    sidednessByActionCode: LINEAR_SIDEDNESS,
    ...overrides
  })

  const existing = (actionCode, billedLengthMeters) => ({
    actionCode,
    billedLengthMeters
  })

  describe('with nothing competing for the boundary', () => {
    it('offers a both-sides action the whole perimeter', () => {
      const result = calculateAvailableLength('BND1', [], parcel())

      expect(result).toEqual({
        availableLength: PARCEL_PERIMETER_METERS,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 0,
        exceedsBoundary: false,
        incompatibleActions: []
      })
    })

    it('offers a single-side action both faces of the whole perimeter', () => {
      const result = calculateAvailableLength('BND2', [], parcel())

      expect(result).toEqual({
        availableLength: 2 * PARCEL_PERIMETER_METERS,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 0,
        exceedsBoundary: false,
        incompatibleActions: []
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
        exceedsBoundary: false,
        incompatibleActions: []
      })
    })
  })

  describe('converting existing actions to physical extent', () => {
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND2', 1000)]
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND1', 300)]
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND2', 2 * PARCEL_PERIMETER_METERS)]
      })
    })

    it('rounds an odd single-side length up to the next whole metre of extent', () => {
      const result = calculateAvailableLength(
        'BND1',
        [existing('BND2', 1001)],
        parcel()
      )

      expect(result).toEqual({
        availableLength: 499,
        boundaryLengthMeters: PARCEL_PERIMETER_METERS,
        incompatibleLengthMeters: 501,
        exceedsBoundary: false,
        incompatibleActions: [existing('BND2', 1001)]
      })
    })

    it('rounds each fractional extent up before adding them', () => {
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND1', 200.4), existing('BND1', 150.3)]
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
        exceedsBoundary: false,
        incompatibleActions: []
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
        exceedsBoundary: false,
        incompatibleActions: [existing('HRW1', 400)]
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
        exceedsBoundary: false,
        incompatibleActions: []
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND1', 200)]
      })
    })
  })

  describe('when existing actions exceed the boundary', () => {
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
        exceedsBoundary: true,
        incompatibleActions: [existing('BND1', 1200)]
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
        exceedsBoundary: false,
        incompatibleActions: [existing('BND1', PARCEL_PERIMETER_METERS)]
      })
    })
  })

  // Each test filters for the cases that break its rule, and expects there to be none
  describe('invariants', () => {
    const LINEAR_CODES = ['BND1', 'BND2', 'CHRW2', 'WBD2']

    const billingFactorOf = (code) =>
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

    it('never offers less than zero or more than the whole boundary in the action’s own units', () => {
      const violations = CASES.filter((testCase) => {
        const { availableLength } = calculate(testCase)

        const ceiling =
          testCase.boundaryLengthMeters * billingFactorOf(testCase.targetCode)

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
          availableLength % billingFactorOf(testCase.targetCode) !== 0
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

        return original.availableLength !== withReversed.availableLength
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
        const stillFits = !withCompatible.exceedsBoundary

        return stillFits && lengthChanged
      })

      expect(violations).toEqual([])
    })
  })
})
