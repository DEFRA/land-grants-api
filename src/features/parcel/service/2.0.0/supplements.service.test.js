import { getSupplementsWithAvailability } from './supplements.service.js'
import { getActionsForParcel } from './parcel.service.js'

vi.mock('./parcel.service.js')

const mockGetActionsForParcel = vi.mocked(getActionsForParcel)

const supplementAction = (code, unit = 'ha') => ({
  code,
  description: `${code} description`,
  semanticVersion: '1.0.0',
  applicationUnitOfMeasurement: unit
})

const reported = (code, availability, extra = {}) => ({
  code,
  availability,
  isAvailable: availability.value > 0,
  hasSupplements: false,
  ...extra
})

const parcel = { parcel_id: '9238', sheet_id: 'SX0679', area_sqm: 100000 }

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8 and GRH11
const baseAction = { actionCode: 'CLIG3', quantity: 10, unit: 'ha' }

const supplementsFor = (overrides = {}) =>
  getSupplementsWithAvailability({
    parcel,
    baseAction,
    selectedSupplements: [],
    plannedActions: [],
    supplementActions: [supplementAction('GRH7'), supplementAction('GRH8')],
    unitByActionCode: {},
    compatibilityCheckFn: () => false,
    agreements: [],
    request: {},
    ...overrides
  })

const reportAvailability = (byCode) =>
  mockGetActionsForParcel.mockImplementation(
    (_parcel, _payload, _showResults, { displayedActions }) =>
      Promise.resolve({
        actions: displayedActions.map((action) => byCode[action.code])
      })
  )

const plannedActionsFor = (code) =>
  mockGetActionsForParcel.mock.calls.find(
    ([, , , { displayedActions }]) => displayedActions[0].code === code
  )[1].plannedActions

describe('getSupplementsWithAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportAvailability({
      GRH7: reported('GRH7', { unit: 'ha', value: 6 }),
      GRH8: reported('GRH8', { unit: 'ha', value: 12 })
    })
  })

  test('reports each supplement as the available area calculation does, capped at the base action area', async () => {
    const supplements = await supplementsFor()

    expect(supplements).toEqual([
      {
        code: 'GRH7',
        availability: { unit: 'ha', value: 6 },
        isAvailable: true
      },
      {
        code: 'GRH8',
        availability: { unit: 'ha', value: 10 },
        isAvailable: true
      }
    ])
  })

  test('caps a supplement measured in square metres', async () => {
    reportAvailability({
      GRH7: reported('GRH7', { unit: 'sqm', value: 120000 })
    })

    const [supplement] = await supplementsFor({
      supplementActions: [supplementAction('GRH7', 'sqm')],
      baseAction: { actionCode: 'CLIG3', quantity: 25000, unit: 'sqm' }
    })

    expect(supplement.availability).toEqual({ unit: 'sqm', value: 25000 })
  })

  test('leaves an unavailable supplement as the calculation reports it', async () => {
    const unavailableReason = { code: 'existing-actions-do-not-fit' }
    reportAvailability({
      GRH7: reported(
        'GRH7',
        { unit: 'ha', value: 0 },
        { isAvailable: false, unavailableReason }
      )
    })

    const [supplement] = await supplementsFor({
      supplementActions: [supplementAction('GRH7')]
    })

    expect(supplement).toEqual({
      code: 'GRH7',
      availability: { unit: 'ha', value: 0 },
      isAvailable: false,
      unavailableReason
    })
  })

  test('caps a supplement unavailable for a failed rule, keeping its reason', async () => {
    const unavailableReason = { code: 'rule-failed' }
    reportAvailability({
      GRH7: reported(
        'GRH7',
        { unit: 'ha', value: 13 },
        { isAvailable: false, unavailableReason }
      )
    })

    const [supplement] = await supplementsFor({
      supplementActions: [supplementAction('GRH7')]
    })

    expect(supplement).toEqual({
      code: 'GRH7',
      availability: { unit: 'ha', value: 10 },
      isAvailable: false,
      unavailableReason
    })
  })

  test('runs the calculation for one supplement at a time, without results', async () => {
    const compatibilityCheckFn = () => true
    const agreements = [{ actionCode: 'CAGF1', quantity: 2, unit: 'ha' }]

    await supplementsFor({ compatibilityCheckFn, agreements })

    expect(mockGetActionsForParcel).toHaveBeenCalledTimes(2)
    const [call] = mockGetActionsForParcel.mock.calls
    expect(call[0]).toBe(parcel)
    expect(call[1].fields).toEqual(['actions'])
    expect(call[2]).toBe(false)
    expect(call[3].displayedActions).toEqual([supplementAction('GRH7')])
    expect(call[4]).toBe(compatibilityCheckFn)
    expect(call[6]).toBe(agreements)
  })

  test('counts every other action selected on the parcel, leaving out the supplement itself', async () => {
    const grh7 = { actionCode: 'GRH7', quantity: 6, unit: 'ha' }
    const grh8 = { actionCode: 'GRH8', quantity: 4, unit: 'ha' }
    const cagf1 = { actionCode: 'CAGF1', quantity: 4, unit: 'ha' }

    await supplementsFor({
      selectedSupplements: [grh7, grh8],
      plannedActions: [cagf1, { ...baseAction, quantity: 8 }, grh7]
    })

    expect(plannedActionsFor('GRH7')).toEqual([cagf1, baseAction, grh8])
    expect(plannedActionsFor('GRH8')).toEqual([cagf1, baseAction, grh7])
  })

  describe('supplements sharing the base action area', () => {
    // Real 2026 rows: GRH7 and GRH8 have no SUPCO row, so they cannot overlap
    const noSupco = () => false
    const grh7 = { actionCode: 'GRH7', quantity: 6, unit: 'ha' }

    test('leaves a supplement what the other selected supplements leave of the base', async () => {
      const [, grh8] = await supplementsFor({
        selectedSupplements: [grh7],
        compatibilityCheckFn: noSupco
      })

      // The parcel has 12 ha for GRH8, but GRH7 takes 6 of the 10 ha of CLIG3
      expect(grh8.availability).toEqual({ unit: 'ha', value: 4 })
      expect(grh8.isAvailable).toBe(true)
    })

    test('lets supplements with a SUPCO row stack on the whole base', async () => {
      const [, grh8] = await supplementsFor({
        selectedSupplements: [grh7],
        compatibilityCheckFn: (a, b) =>
          [a, b].sort().join() === ['GRH7', 'GRH8'].join()
      })

      expect(grh8.availability).toEqual({ unit: 'ha', value: 10 })
    })

    test('does not count a supplement against itself', async () => {
      const [grh7Supplement] = await supplementsFor({
        selectedSupplements: [grh7],
        compatibilityCheckFn: noSupco
      })

      expect(grh7Supplement.availability).toEqual({ unit: 'ha', value: 6 })
    })

    test('makes a supplement unavailable when the others take all of the base', async () => {
      const [, grh8] = await supplementsFor({
        selectedSupplements: [{ ...grh7, quantity: 10 }],
        compatibilityCheckFn: noSupco
      })

      expect(grh8).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 0 },
          isAvailable: false,
          unavailableReason: expect.objectContaining({
            code: 'no-availability'
          })
        })
      )
    })
  })

  test('returns no supplements when the base action has none', async () => {
    expect(await supplementsFor({ supplementActions: [] })).toEqual([])
    expect(mockGetActionsForParcel).not.toHaveBeenCalled()
  })
})
