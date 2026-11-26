import { getSupplementsWithAvailability } from './supplements.service.js'
import { getActionsForParcel } from './parcel.service.js'

vi.mock('./parcel.service.js')

const mockGetActionsForParcel = vi.mocked(getActionsForParcel)

const supplementAction = (code, unit = 'ha') => ({
  code,
  description: `${code} description`,
  semanticVersion: '1.0.0',
  applicationUnitOfMeasurement: unit,
  display: true
})

const reported = (code) => ({
  code,
  availability: { unit: 'ha', value: 6 },
  isAvailable: true,
  hasSupplements: false
})

const parcel = { parcel_id: '9238', sheet_id: 'SX0679', area_sqm: 100000 }

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8 and SPM3, and AGF1 for SPM3
const baseCodesBySupplement = new Map([
  ['GRH7', new Set(['CLIG3'])],
  ['GRH8', new Set(['CLIG3'])],
  ['SPM3', new Set(['CLIG3', 'AGF1'])]
])
const baseAction = { actionCode: 'CLIG3', quantity: 10, unit: 'ha' }

const supplementsFor = (overrides = {}) =>
  getSupplementsWithAvailability({
    parcel,
    baseActionCode: 'CLIG3',
    plannedActions: [baseAction],
    enabledActions: [
      supplementAction('CLIG3'),
      supplementAction('GRH7'),
      supplementAction('GRH8')
    ],
    baseCodesBySupplement,
    unitByActionCode: {},
    compatibilityCheckFn: () => false,
    getAgreements: () => Promise.resolve([]),
    request: {},
    ...overrides
  })

const callFor = (code) =>
  mockGetActionsForParcel.mock.calls.find(
    ([, , , { displayedActions }]) => displayedActions[0].code === code
  )

const plannedActionsFor = (code) => callFor(code)[1].plannedActions

// The cap the calculation is given for a supplement, in hectares
const capHaFor = (code) => callFor(code)[3].availableAreaCapSqm[code] / 10000

describe('getSupplementsWithAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActionsForParcel.mockImplementation(
      (_parcel, _payload, _showResults, { displayedActions }) =>
        Promise.resolve({
          actions: displayedActions.map((action) => reported(action.code))
        })
    )
  })

  test('reports each supplement as the parcels endpoint does, without its hasSupplements flag', async () => {
    const supplements = await supplementsFor()

    expect(supplements).toEqual([
      {
        code: 'GRH7',
        availability: { unit: 'ha', value: 6 },
        isAvailable: true
      },
      {
        code: 'GRH8',
        availability: { unit: 'ha', value: 6 },
        isAvailable: true
      }
    ])
  })

  test('holds each supplement to the area of its base action', async () => {
    await supplementsFor()

    expect(capHaFor('GRH7')).toBe(10)
    expect(capHaFor('GRH8')).toBe(10)
  })

  test('works out the base action area from square metres', async () => {
    await supplementsFor({
      plannedActions: [{ actionCode: 'CLIG3', quantity: 25000, unit: 'sqm' }]
    })

    expect(capHaFor('GRH7')).toBe(2.5)
  })

  test('runs the calculation for one supplement at a time, without results', async () => {
    const compatibilityCheckFn = () => true
    const agreements = [{ actionCode: 'CAGF1', quantity: 2, unit: 'ha' }]

    await supplementsFor({
      compatibilityCheckFn,
      getAgreements: () => Promise.resolve(agreements)
    })

    expect(mockGetActionsForParcel).toHaveBeenCalledTimes(2)
    const [call] = mockGetActionsForParcel.mock.calls
    expect(call[0]).toBe(parcel)
    expect(call[1].fields).toEqual(['actions'])
    expect(call[2]).toBe(false)
    expect(call[3].displayedActions).toEqual([supplementAction('GRH7')])
    expect(call[4]).toBe(compatibilityCheckFn)
    expect(call[6]).toBe(agreements)
  })

  test('counts every action selected on the parcel, the supplement itself among them, as /parcels does', async () => {
    const grh7 = { actionCode: 'GRH7', quantity: 6, unit: 'ha' }
    const grh8 = { actionCode: 'GRH8', quantity: 4, unit: 'ha' }
    const cagf1 = { actionCode: 'CAGF1', quantity: 4, unit: 'ha' }

    await supplementsFor({
      plannedActions: [cagf1, baseAction, grh7, grh8]
    })

    expect(plannedActionsFor('GRH7')).toEqual([cagf1, baseAction, grh7, grh8])
    expect(plannedActionsFor('GRH8')).toEqual([cagf1, baseAction, grh7, grh8])
  })

  describe('supplements sharing the base action area', () => {
    // Real 2026 rows: GRH7 and GRH8 have no SUPCO row, so they cannot overlap
    const noSupco = () => false
    const grh7 = { actionCode: 'GRH7', quantity: 6, unit: 'ha' }

    test('leaves a supplement what the other selected supplements leave of the base', async () => {
      await supplementsFor({
        plannedActions: [baseAction, grh7],
        compatibilityCheckFn: noSupco
      })

      // GRH7 takes 6 of the 10 ha of CLIG3
      expect(capHaFor('GRH8')).toBe(4)
    })

    test('lets supplements with a SUPCO row stack on the whole base', async () => {
      await supplementsFor({
        plannedActions: [baseAction, grh7],
        compatibilityCheckFn: (a, b) =>
          [a, b].sort().join() === ['GRH7', 'GRH8'].join()
      })

      expect(capHaFor('GRH8')).toBe(10)
    })

    test('counts a supplement against itself, leaving what is left on top of its selection', async () => {
      await supplementsFor({
        plannedActions: [baseAction, grh7],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH7')).toBe(4)
    })

    test('leaves a supplement nothing when its own selection takes all of the base', async () => {
      await supplementsFor({
        plannedActions: [baseAction, { ...grh7, quantity: 10 }],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH7')).toBe(0)
      expect(capHaFor('GRH8')).toBe(0)
    })

    test('leaves a supplement nothing when the others take all of the base', async () => {
      await supplementsFor({
        plannedActions: [baseAction, { ...grh7, quantity: 10 }],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH8')).toBe(0)
    })
  })

  describe('supplements on other base actions', () => {
    const agf1 = { actionCode: 'AGF1', quantity: 3, unit: 'ha' }
    const noSupco = () => false

    test('lets a supplement with several bases use only the area of the base action asked about', async () => {
      await supplementsFor({
        plannedActions: [baseAction, agf1],
        enabledActions: [supplementAction('GRH7'), supplementAction('SPM3')]
      })

      expect(capHaFor('GRH7')).toBe(10)
      expect(capHaFor('SPM3')).toBe(10)
    })

    test('counts a supplement given this base action against the others on it', async () => {
      await supplementsFor({
        plannedActions: [
          baseAction,
          {
            actionCode: 'GRH7',
            quantity: 6,
            unit: 'ha',
            baseActionCode: 'CLIG3'
          }
        ],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH8')).toBe(4)
    })

    test('counts a supplement given no base action against the base action asked about, when it is one of its bases', async () => {
      await supplementsFor({
        plannedActions: [
          baseAction,
          agf1,
          { actionCode: 'SPM3', quantity: 6, unit: 'ha' }
        ],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH7')).toBe(4)
    })

    test('leaves the base action alone for a supplement given another base action, which still competes for the parcel', async () => {
      const spm3OnAgf1 = {
        actionCode: 'SPM3',
        quantity: 3,
        unit: 'ha',
        baseActionCode: 'AGF1'
      }

      await supplementsFor({
        plannedActions: [baseAction, agf1, spm3OnAgf1],
        compatibilityCheckFn: noSupco
      })

      expect(capHaFor('GRH7')).toBe(10)
      expect(plannedActionsFor('GRH7')).toContainEqual(spm3OnAgf1)
    })

    test('reports no base actions on the supplements', async () => {
      const [spm3] = await supplementsFor({
        plannedActions: [baseAction, agf1],
        enabledActions: [supplementAction('SPM3')]
      })

      expect(spm3).not.toHaveProperty('baseActionCodes')
    })
  })

  test('leaves out planned actions that are not areas from the base action area', async () => {
    await supplementsFor({
      plannedActions: [
        baseAction,
        { actionCode: 'GRH8', quantity: 40000, unit: 'm' }
      ],
      enabledActions: [supplementAction('GRH7')]
    })

    expect(capHaFor('GRH7')).toBe(10)
  })

  test('leaves out supplements that are enabled but not displayed', async () => {
    const supplements = await supplementsFor({
      enabledActions: [
        supplementAction('GRH7'),
        { ...supplementAction('GRH8'), display: false }
      ]
    })

    expect(supplements.map((s) => s.code)).toEqual(['GRH7'])
  })

  test('leaves out enabled actions that are not supplements of the base action', async () => {
    const supplements = await supplementsFor({
      enabledActions: [
        supplementAction('CLIG3'),
        supplementAction('CAGF1'),
        supplementAction('GRH8')
      ]
    })

    expect(supplements.map((s) => s.code)).toEqual(['GRH8'])
  })

  test('returns no supplements, without reading agreements, when the base action has none', async () => {
    const getAgreements = vi.fn()

    expect(
      await supplementsFor({
        enabledActions: [supplementAction('CLIG3')],
        getAgreements
      })
    ).toEqual([])
    expect(mockGetActionsForParcel).not.toHaveBeenCalled()
    expect(getAgreements).not.toHaveBeenCalled()
  })
})
