import { getAvailableAreaDataRequirements } from './availableAreaDataRequirements.js'
import { getLandCoverDefinitions } from '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import {
  getLandCoversForAction,
  getLandCoversForActions
} from '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
import { getLandCoversForParcel } from '~/src/features/parcel/queries/getLandCoversForParcel.query.js'
import { getLandCoverIntersections } from '~/src/features/land-covers/queries/getLandCoverIntersections.query.js'
import { getActionEligibility } from '~/src/features/actions/queries/getActionEligibility.query.js'

vi.mock(
  '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'
)
vi.mock(
  '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
)
vi.mock('~/src/features/parcel/queries/getLandCoversForParcel.query.js')
vi.mock('~/src/features/land-covers/queries/getLandCoverIntersections.query.js')
vi.mock('~/src/features/actions/queries/getActionEligibility.query.js')

describe('getAvailableAreaDataRequirements', () => {
  const db = {}
  const logger = { info: vi.fn(), error: vi.fn() }
  const existingActions = [{ actionCode: 'CMOR1', areaSqm: 1000 }]

  const requirementsFor = (actionCode, cache) =>
    getAvailableAreaDataRequirements(
      actionCode,
      'SX0679',
      '9238',
      existingActions,
      db,
      logger,
      cache
    )

  beforeEach(() => {
    vi.clearAllMocks()
    getLandCoversForAction.mockImplementation((code) =>
      Promise.resolve([{ landCoverCode: `${code}-cover` }])
    )
    getLandCoversForParcel.mockResolvedValue([
      { landCoverClassCode: '130', areaSqm: 300 },
      { landCoverClassCode: '130', areaSqm: 200 },
      { landCoverClassCode: '110', areaSqm: 100 }
    ])
    getLandCoversForActions.mockResolvedValue({
      CMOR1: [{ landCoverCode: '131' }]
    })
    getLandCoverDefinitions.mockResolvedValue([])
    getLandCoverIntersections.mockResolvedValue({
      sssiOverlap: [{ landCoverClassCode: '130', areaSqm: 50 }],
      hfOverlap: [],
      sssiAndHfOverlap: []
    })
    getActionEligibility.mockResolvedValue([
      { code: 'UPL1', sssi_eligible: true, hf_eligible: false }
    ])
  })

  it('returns the land cover and eligibility data the AAC needs', async () => {
    const requirements = await requirementsFor('UPL1')

    expect(requirements).toEqual({
      landCoverCodesForAppliedForAction: [{ landCoverCode: 'UPL1-cover' }],
      landCoversForParcel: [
        { landCoverClassCode: '130', areaSqm: 500 },
        { landCoverClassCode: '110', areaSqm: 100 }
      ],
      landCoversForExistingActions: { CMOR1: [{ landCoverCode: '131' }] },
      landCoverToString: expect.any(Function),
      sssiOverlap: [{ landCoverClassCode: '130', areaSqm: 50 }],
      hfOverlap: [],
      sssiAndHfOverlap: [],
      sssiActionEligibility: { UPL1: true },
      hfActionEligibility: { UPL1: false }
    })
  })

  it('looks up the definitions of every land cover involved', async () => {
    await requirementsFor('UPL1')

    expect(getLandCoverDefinitions).toHaveBeenCalledWith(
      ['UPL1-cover', '130', '110', '131'],
      db,
      logger
    )
  })

  it('fetches the parcel data again for every call without a cache', async () => {
    await requirementsFor('UPL1')
    await requirementsFor('UPL2')

    expect(getLandCoversForParcel).toHaveBeenCalledTimes(2)
    expect(getLandCoverIntersections).toHaveBeenCalledTimes(2)
    expect(getActionEligibility).toHaveBeenCalledTimes(2)
  })

  describe('with a cache shared across actions', () => {
    it('fetches the parcel land covers, intersections and action eligibility once', async () => {
      const cache = new Map()

      const upl1 = await requirementsFor('UPL1', cache)
      const upl2 = await requirementsFor('UPL2', cache)

      expect(getLandCoversForParcel).toHaveBeenCalledTimes(1)
      expect(getLandCoverIntersections).toHaveBeenCalledTimes(1)
      expect(getActionEligibility).toHaveBeenCalledTimes(1)
      expect(upl2.landCoversForParcel).toEqual(upl1.landCoversForParcel)
      expect(upl2.sssiOverlap).toEqual(upl1.sssiOverlap)
    })

    it('still fetches the data that depends on the action for every action', async () => {
      const cache = new Map()

      const upl1 = await requirementsFor('UPL1', cache)
      const upl2 = await requirementsFor('UPL2', cache)

      expect(getLandCoversForAction).toHaveBeenCalledTimes(2)
      expect(getLandCoverDefinitions).toHaveBeenCalledTimes(2)
      expect(upl1.landCoverCodesForAppliedForAction).toEqual([
        { landCoverCode: 'UPL1-cover' }
      ])
      expect(upl2.landCoverCodesForAppliedForAction).toEqual([
        { landCoverCode: 'UPL2-cover' }
      ])
    })

    it('shares a fetch still in flight', async () => {
      const cache = new Map()

      await Promise.all([
        requirementsFor('UPL1', cache),
        requirementsFor('UPL2', cache)
      ])

      expect(getLandCoversForParcel).toHaveBeenCalledTimes(1)
      expect(getLandCoverIntersections).toHaveBeenCalledTimes(1)
      expect(getActionEligibility).toHaveBeenCalledTimes(1)
    })

    it('keeps each parcel apart', async () => {
      const cache = new Map()

      await requirementsFor('UPL1', cache)
      await getAvailableAreaDataRequirements(
        'UPL1',
        'SX0679',
        '1111',
        existingActions,
        db,
        logger,
        cache
      )

      expect(getLandCoversForParcel).toHaveBeenCalledTimes(2)
      expect(getLandCoverIntersections).toHaveBeenCalledTimes(2)
      expect(getActionEligibility).toHaveBeenCalledTimes(1)
    })
  })
})
