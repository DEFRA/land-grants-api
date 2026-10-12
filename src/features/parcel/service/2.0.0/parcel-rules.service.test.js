import { runParcelRules } from './parcel-rules.service.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { resolveApplicationData } from '~/src/features/rules-engine/services/resolveApplicationData.js'

// A registry with one rule that needs an applied-for quantity and two that
// don't, so the filtering is tested apart from the real rules
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({
  rules: {
    'needs-quantity-1.0.0': { requires: [{ type: 'APPLIED_FOR_QUANTITY' }] },
    'needs-size-1.0.0': { requires: [{ type: 'PARCEL_SIZE' }] },
    'needs-nothing-1.0.0': {}
  }
}))
vi.mock('~/src/features/rules-engine/rulesEngine.js')
vi.mock(
  '~/src/features/rules-engine/services/resolveApplicationData.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      resolveApplicationData: vi.fn()
    }
  }
)

describe('runParcelRules', () => {
  const quantityRule = { name: 'needs-quantity' }
  const sizeRule = { name: 'needs-size' }
  const plainRule = { name: 'needs-nothing' }

  const mockLogger = { warn: vi.fn() }
  const mockPostgresDb = {}
  const mockCompatibilityCheckFn = vi.fn()

  const parcel = { sheet_id: 'SX0679', parcel_id: '9238', area_sqm: 100000 }

  const action = {
    code: 'UPL1',
    applicationUnitOfMeasurement: 'ha',
    rules: [quantityRule, sizeRule, plainRule]
  }

  const existingActions = [{ actionCode: 'CMOR1', quantity: 2, unit: 'ha' }]
  const enabledActions = [{ code: 'UPL1' }, { code: 'CMOR1' }]

  const context = {
    enabledActions,
    compatibilityCheckFn: mockCompatibilityCheckFn,
    parcel,
    postgresDb: mockPostgresDb,
    logger: mockLogger
  }

  const resolvedApplication = {
    applicationUnitOfMeasurement: 'ha',
    actionCodeAppliedFor: 'UPL1',
    landParcel: { existingAgreements: existingActions, parcelSizeSqm: 100000 }
  }

  const rulesResult = { passed: true, results: [{ passed: true }] }

  beforeEach(() => {
    vi.clearAllMocks()
    resolveApplicationData.mockResolvedValue(resolvedApplication)
    executeRules.mockReturnValue(rulesResult)
  })

  test('should not resolve data for rules that need an applied-for quantity', async () => {
    await runParcelRules(action, existingActions, context)

    const [parcelRules] = resolveApplicationData.mock.calls[0]

    expect(parcelRules).toEqual([sizeRule, plainRule])
  })

  test('should not execute rules that need an applied-for quantity', async () => {
    await runParcelRules(action, existingActions, context)

    const [, , parcelRules] = executeRules.mock.calls[0]

    expect(parcelRules).toEqual([sizeRule, plainRule])
  })

  test('should start the application from the action, existing actions and the known parcel size', async () => {
    await runParcelRules(action, existingActions, context)

    const [, baseApplication] = resolveApplicationData.mock.calls[0]

    expect(baseApplication).toEqual({
      applicationUnitOfMeasurement: 'ha',
      actionCodeAppliedFor: 'UPL1',
      landParcel: {
        existingAgreements: existingActions,
        parcelSizeSqm: 100000
      }
    })
  })

  test('should give the data providers the parcel, actions and handles they fetch with', async () => {
    await runParcelRules(action, existingActions, context)

    const [, , requirementContext] = resolveApplicationData.mock.calls[0]

    expect(requirementContext).toEqual({
      action,
      actions: enabledActions,
      agreements: existingActions,
      compatibilityCheckFn: mockCompatibilityCheckFn,
      landAction: { sheetId: 'SX0679', parcelId: '9238', actions: [] },
      db: mockPostgresDb,
      logger: mockLogger
    })
  })

  test('should execute the rules against the resolved application, tagged with the parcel and action', async () => {
    await runParcelRules(action, existingActions, context)

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      {
        ...resolvedApplication,
        sheetId: 'SX0679',
        parcelId: '9238',
        actionCode: 'UPL1'
      },
      [sizeRule, plainRule]
    )
  })

  test('should return the rules engine result', async () => {
    const result = await runParcelRules(action, existingActions, context)

    expect(result).toBe(rulesResult)
  })

  test('should run no rules when the action has none configured', async () => {
    await runParcelRules(
      { ...action, rules: undefined },
      existingActions,
      context
    )

    const [parcelRules] = resolveApplicationData.mock.calls[0]

    expect(parcelRules).toEqual([])
    expect(executeRules).toHaveBeenCalledWith(rules, expect.any(Object), [])
  })

  test('should run no rules when every rule needs an applied-for quantity', async () => {
    await runParcelRules(
      { ...action, rules: [quantityRule] },
      existingActions,
      context
    )

    expect(executeRules).toHaveBeenCalledWith(rules, expect.any(Object), [])
  })
})
