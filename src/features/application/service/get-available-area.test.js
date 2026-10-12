import { getAvailableArea } from './get-available-area.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'

vi.mock('~/src/features/available-area/availableArea.js')
vi.mock('~/src/features/available-area/availableAreaDataRequirements.js')
vi.mock('~/src/features/available-area/explanations.js')

describe('getAvailableArea', () => {
  // CMOR1 is measured in hectares, CSAM1 in square metres, BND1 in metres and
  // WBD1 by count
  const actions = [
    { code: 'CMOR1', applicationUnitOfMeasurement: 'ha' },
    { code: 'CSAM1', applicationUnitOfMeasurement: 'sqm' },
    { code: 'BND1', applicationUnitOfMeasurement: 'm' },
    { code: 'WBD1', applicationUnitOfMeasurement: 'count' }
  ]

  const landAction = { sheetId: 'SH123', parcelId: '9456', actions: [] }
  const compatibilityCheckFn = vi.fn()
  const db = {}
  const logger = { info: vi.fn(), error: vi.fn() }

  const landCoverToString = vi.fn()
  const aacDataRequirements = { landCoverToString }

  const lpResult = {
    availableAreaSqm: 8000,
    availableAreaHectares: 0.8,
    totalValidLandCoverSqm: 10000,
    feasible: true,
    context: { existingActions: [] }
  }

  const explanations = [{ title: 'Explanation', content: [] }]

  // What the service worked out is competing for the parcel's area
  const existingActionsPassed = () => {
    const [, , , existingActions] =
      getAvailableAreaDataRequirements.mock.calls[0]
    return existingActions
  }

  const availableAreaFor = (action, agreements = [], siblings = []) =>
    getAvailableArea(
      action,
      actions,
      agreements,
      compatibilityCheckFn,
      { ...landAction, actions: [action, ...siblings] },
      db,
      logger
    )

  beforeEach(() => {
    vi.clearAllMocks()
    getAvailableAreaDataRequirements.mockResolvedValue(aacDataRequirements)
    findMaximumAvailableArea.mockReturnValue(lpResult)
    formatExplanationSections.mockReturnValue(explanations)
  })

  it('reads the data requirements of the parcel the action is applied for', async () => {
    const action = { code: 'CMOR1', quantity: 1 }

    await availableAreaFor(action)

    expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
      'CMOR1',
      'SH123',
      '9456',
      [],
      db,
      logger
    )
  })

  describe('sibling actions', () => {
    it('excludes the action itself', async () => {
      const action = { code: 'CMOR1', quantity: 1 }

      await availableAreaFor(action)

      expect(existingActionsPassed()).toEqual([])
    })

    it('keeps a sibling with the same code as the action', async () => {
      const action = { code: 'CMOR1', quantity: 1 }
      const sibling = { code: 'CMOR1', quantity: 2 }

      await availableAreaFor(action, [], [sibling])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'CMOR1', areaSqm: 20000 }
      ])
    })

    it('converts a sibling measured in hectares to square metres', async () => {
      const action = { code: 'CSAM1', quantity: 100 }
      const sibling = { code: 'CMOR1', quantity: 1.5 }

      await availableAreaFor(action, [], [sibling])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'CMOR1', areaSqm: 15000 }
      ])
    })

    it('keeps a sibling measured in square metres as it is', async () => {
      const action = { code: 'CMOR1', quantity: 1 }
      const sibling = { code: 'CSAM1', quantity: 250 }

      await availableAreaFor(action, [], [sibling])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'CSAM1', areaSqm: 250 }
      ])
    })

    it('treats a sibling with no enabled-action config as hectares', async () => {
      const action = { code: 'CMOR1', quantity: 1 }
      const sibling = { code: 'UNKNOWN', quantity: 0.5 }

      await availableAreaFor(action, [], [sibling])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'UNKNOWN', areaSqm: 5000 }
      ])
    })

    it.each([
      ['metres', 'BND1'],
      ['count', 'WBD1']
    ])(
      'excludes a sibling measured in %s, which does not compete for area',
      async (_, code) => {
        const action = { code: 'CMOR1', quantity: 1 }
        const sibling = { code, quantity: 100 }

        await availableAreaFor(action, [], [sibling])

        expect(existingActionsPassed()).toEqual([])
      }
    )
  })

  describe('agreements', () => {
    it('keeps an agreement measured in square metres as it is', async () => {
      const action = { code: 'CMOR1', quantity: 1 }
      const agreement = { actionCode: 'CSAM1', quantity: 3000, unit: 'sqm' }

      await availableAreaFor(action, [agreement])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'CSAM1', areaSqm: 3000 }
      ])
    })

    it('converts an agreement measured in hectares to square metres', async () => {
      const action = { code: 'CSAM1', quantity: 100 }
      const agreement = { actionCode: 'CMOR1', quantity: 0.25, unit: 'ha' }

      await availableAreaFor(action, [agreement])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'CMOR1', areaSqm: 2500 }
      ])
    })

    it.each([
      ['metres', { actionCode: 'BND1', quantity: 200, unit: 'm' }],
      ['count', { actionCode: 'WBD1', quantity: 800, unit: 'count' }],
      ['no unit', { actionCode: 'CMOR1', quantity: 1 }]
    ])(
      'excludes an agreement measured in %s, which does not compete for area',
      async (_, agreement) => {
        const action = { code: 'CMOR1', quantity: 1 }

        await availableAreaFor(action, [agreement])

        expect(existingActionsPassed()).toEqual([])
      }
    )

    it('judges an agreement by its own unit rather than its action config', async () => {
      const action = { code: 'CMOR1', quantity: 1 }
      // BND1 is configured in metres, but this agreement records an area
      const agreement = { actionCode: 'BND1', quantity: 400, unit: 'sqm' }

      await availableAreaFor(action, [agreement])

      expect(existingActionsPassed()).toEqual([
        { actionCode: 'BND1', areaSqm: 400 }
      ])
    })
  })

  it('treats agreements and siblings alike as existing demand, agreements first', async () => {
    const action = { code: 'CMOR1', quantity: 1 }
    const agreement = { actionCode: 'CSAM1', quantity: 3000, unit: 'sqm' }
    const sibling = { code: 'CMOR1', quantity: 0.5 }

    await availableAreaFor(action, [agreement], [sibling])

    expect(existingActionsPassed()).toEqual([
      { actionCode: 'CSAM1', areaSqm: 3000 },
      { actionCode: 'CMOR1', areaSqm: 5000 }
    ])
  })

  it('finds the maximum available area against the existing demand and data requirements', async () => {
    const action = { code: 'CMOR1', quantity: 1 }
    const agreement = { actionCode: 'CSAM1', quantity: 3000, unit: 'sqm' }

    await availableAreaFor(action, [agreement])

    expect(findMaximumAvailableArea).toHaveBeenCalledWith(
      'CMOR1',
      [{ actionCode: 'CSAM1', areaSqm: 3000 }],
      compatibilityCheckFn,
      aacDataRequirements
    )
  })

  it('returns the available area with its explanations', async () => {
    const action = { code: 'CMOR1', quantity: 1 }

    const result = await availableAreaFor(action)

    expect(result).toEqual({ ...lpResult, explanations })
  })

  it('explains the result in terms of the action and its land covers', async () => {
    const action = { code: 'CMOR1', quantity: 1 }

    await availableAreaFor(action)

    expect(formatExplanationSections).toHaveBeenCalledWith(lpResult.context, {
      targetAction: 'CMOR1',
      availableAreaSqm: 8000,
      totalValidLandCoverSqm: 10000,
      landCoverToString,
      feasible: true
    })
  })

  it('explains an infeasible result as infeasible', async () => {
    const action = { code: 'CMOR1', quantity: 1 }
    findMaximumAvailableArea.mockReturnValue({
      ...lpResult,
      availableAreaSqm: 0,
      feasible: false
    })

    const result = await availableAreaFor(action)

    expect(result.feasible).toBe(false)
    expect(formatExplanationSections).toHaveBeenCalledWith(
      lpResult.context,
      expect.objectContaining({ availableAreaSqm: 0, feasible: false })
    )
  })

  it('rejects when the data requirements cannot be read', async () => {
    const action = { code: 'CMOR1', quantity: 1 }
    getAvailableAreaDataRequirements.mockRejectedValue(new Error('db down'))

    await expect(availableAreaFor(action)).rejects.toThrow('db down')
    expect(findMaximumAvailableArea).not.toHaveBeenCalled()
  })
})
