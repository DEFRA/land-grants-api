import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveRateVersion,
  calculateWMPPaymentWithRateVersion
} from './wmp-rate-version.service.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionBySemanticVersion } from '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
import { executePaymentMethod } from '~/src/features/payments-engine/paymentsEngine.js'

vi.mock(
  '~/src/features/application/queries/getApplicationValidationRun.query.js'
)
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
)
vi.mock('~/src/features/payments-engine/paymentsEngine.js')

const mockGetApplicationValidationRun = getApplicationValidationRun
const mockGetActionsByLatestVersion = getActionsByLatestVersion
const mockGetActionBySemanticVersion = getActionBySemanticVersion
const mockExecutePaymentMethod = executePaymentMethod

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

const createMockAction = (semanticVersion = '1.1.0') => ({
  id: 1,
  code: 'PA3',
  description: 'Woodland Management Plan',
  semanticVersion,
  durationYears: 3,
  rules: [],
  paymentMethod: {
    name: 'wmp-calculation',
    version: '1.0.0',
    config: {
      newWoodlandMaxPercent: 20,
      tiers: [
        {
          lowerLimitHa: 0.5,
          upperLimitHa: 50,
          flatRateGbp: 1500,
          ratePerUnitGbp: 0
        }
      ]
    }
  }
})

const createMockRun = (actionConfigVersion = '1.1.0') => ({
  id: 42,
  application_id: 'APP-1',
  data: {
    applicationId: 'APP-1',
    hasPassed: true,
    parcelLevelResults: [
      {
        sheetId: 'SX0679',
        parcelId: '99238',
        actions: [
          { code: 'CMOR1', actionConfigVersion: '1.0.0' },
          { code: 'PA3', actionConfigVersion }
        ]
      },
      {
        sheetId: 'SX0679',
        parcelId: '99239',
        actions: [{ code: 'PA3', actionConfigVersion }]
      }
    ]
  }
})

describe('resolveRateVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the explicit version without touching the database', async () => {
    const result = await resolveRateVersion(logger, {}, { version: '1.0.0' })

    expect(result).toEqual({ semanticVersion: '1.0.0', source: 'explicit' })
    expect(mockGetApplicationValidationRun).not.toHaveBeenCalled()
    expect(mockGetActionsByLatestVersion).not.toHaveBeenCalled()
  })

  it('resolves the version pinned in a validation run', async () => {
    mockGetApplicationValidationRun.mockResolvedValue(createMockRun('1.1.0'))

    const result = await resolveRateVersion(logger, {}, { validationRunId: 42 })

    expect(mockGetApplicationValidationRun).toHaveBeenCalledWith(logger, {}, 42)
    expect(result).toEqual({
      semanticVersion: '1.1.0',
      source: 'run'
    })
    expect(logger.info).toHaveBeenCalled()
  })

  it('prefers the most recent pinned entry when an action appears on multiple parcels', async () => {
    const run = createMockRun('1.1.0')
    run.data.parcelLevelResults[1].actions = [
      { code: 'PA3', actionConfigVersion: '1.2.0' }
    ]
    mockGetApplicationValidationRun.mockResolvedValue(run)

    const result = await resolveRateVersion(logger, {}, { validationRunId: 42 })

    expect(result.semanticVersion).toBe('1.2.0')
  })

  it('returns an error when the validation run does not exist', async () => {
    mockGetApplicationValidationRun.mockResolvedValue(null)

    const result = await resolveRateVersion(
      logger,
      {},
      { validationRunId: 999 }
    )

    expect(result.error).toBe("Application validation run '999' not found")
  })

  it('resolves the version pinned in a validation run belonging to the given application', async () => {
    mockGetApplicationValidationRun.mockResolvedValue(createMockRun('1.1.0'))

    const result = await resolveRateVersion(
      logger,
      {},
      {
        validationRunId: 42,
        applicationId: 'APP-1'
      }
    )

    expect(result).toEqual({
      semanticVersion: '1.1.0',
      source: 'run'
    })
  })

  it('returns an error when the validation run belongs to a different application', async () => {
    const run = createMockRun('1.1.0')
    run.application_id = 'APP-OTHER'
    mockGetApplicationValidationRun.mockResolvedValue(run)

    const result = await resolveRateVersion(
      logger,
      {},
      {
        validationRunId: 42,
        applicationId: 'APP-1'
      }
    )

    expect(result.error).toBe(
      "Application validation run '42' does not belong to application 'APP-1'"
    )
  })

  it('returns an error when the run has no stored application id and one is supplied', async () => {
    mockGetApplicationValidationRun.mockResolvedValue({
      id: 42,
      application_id: null,
      data: createMockRun().data
    })

    const result = await resolveRateVersion(
      logger,
      {},
      {
        validationRunId: 42,
        applicationId: 'APP-1'
      }
    )

    expect(result.error).toContain("does not belong to application 'APP-1'")
  })

  it('does not enforce application linkage when no application id is supplied', async () => {
    const run = createMockRun('1.1.0')
    run.application_id = undefined
    mockGetApplicationValidationRun.mockResolvedValue(run)

    const result = await resolveRateVersion(logger, {}, { validationRunId: 42 })

    expect(result).toEqual({ semanticVersion: '1.1.0', source: 'run' })
  })

  it('returns an error when the run has no stored payload', async () => {
    mockGetApplicationValidationRun.mockResolvedValue({ id: 42, data: null })

    const result = await resolveRateVersion(logger, {}, { validationRunId: 42 })

    expect(result.error).toContain("'42' does not contain")
  })

  it('returns an error when the run contains no pinned version for the WMP action code', async () => {
    const run = createMockRun()
    run.data.parcelLevelResults[0].actions = [
      { code: 'CMOR1', actionConfigVersion: '1.0.0' }
    ]
    run.data.parcelLevelResults[1].actions = []
    mockGetApplicationValidationRun.mockResolvedValue(run)

    const result = await resolveRateVersion(logger, {}, { validationRunId: 42 })

    expect(result.error).toContain('PA3')
  })

  it('falls back to latest when no pinning inputs are supplied', async () => {
    const result = await resolveRateVersion(logger, {}, {})

    expect(result).toEqual({ semanticVersion: null, source: 'latest' })
    expect(logger.warn).toHaveBeenCalled()
    expect(mockGetApplicationValidationRun).not.toHaveBeenCalled()
  })
})

describe('calculateWMPPaymentWithRateVersion', () => {
  const calcData = { totalWoodlandAreaSqm: 80000 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetActionsByLatestVersion.mockResolvedValue([createMockAction()])
    mockGetActionBySemanticVersion.mockResolvedValue(createMockAction())
    mockExecutePaymentMethod.mockReturnValue({
      eligibleArea: 8,
      payment: 1500,
      activePaymentTier: 1,
      quantityInActiveTier: 7.5,
      activeTierRatePence: 0,
      activeTierFlatRatePence: 1500
    })
  })

  it('calculates at the exact requested version', async () => {
    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      { version: '1.0.0' }
    )

    expect(mockGetActionBySemanticVersion).toHaveBeenCalledWith(
      logger,
      {},
      'PA3',
      '1.0.0'
    )
    expect(mockGetActionsByLatestVersion).not.toHaveBeenCalled()
    expect(result.paymentResult.payment).toBe(1500)
    expect(result.action.semanticVersion).toBe('1.1.0')
    expect(result.rateVersion).toEqual({ value: '1.0.0', source: 'explicit' })
  })

  it('resolves via a validation run and calculates at the pinned version', async () => {
    mockGetApplicationValidationRun.mockResolvedValue(createMockRun('1.1.0'))

    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      { validationRunId: 42 }
    )

    expect(mockGetActionBySemanticVersion).toHaveBeenCalledWith(
      logger,
      {},
      'PA3',
      '1.1.0'
    )
    expect(result.rateVersion).toEqual({ value: '1.1.0', source: 'run' })
  })

  it('returns an error when the requested version does not exist', async () => {
    mockGetActionBySemanticVersion.mockResolvedValue(null)

    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      { version: '9.9.9' }
    )

    expect(result.error).toBe(
      "Action config for PA3 at version '9.9.9' not found"
    )
    expect(mockExecutePaymentMethod).not.toHaveBeenCalled()
  })

  it('returns an error when the run belongs to a different application than claimed', async () => {
    const run = createMockRun('1.1.0')
    run.application_id = 'APP-OTHER'
    mockGetApplicationValidationRun.mockResolvedValue(run)

    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      { validationRunId: 42, applicationId: 'APP-1' }
    )

    expect(result.error).toContain("does not belong to application 'APP-1'")
    expect(mockExecutePaymentMethod).not.toHaveBeenCalled()
  })

  it('propagates resolution errors without querying configs', async () => {
    mockGetApplicationValidationRun.mockResolvedValue(null)

    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      { validationRunId: 123 }
    )

    expect(result.error).toBeDefined()
    expect(mockGetActionBySemanticVersion).not.toHaveBeenCalled()
    expect(mockGetActionsByLatestVersion).not.toHaveBeenCalled()
    expect(mockExecutePaymentMethod).not.toHaveBeenCalled()
  })

  it('calculates at the latest config when no pinning inputs are supplied', async () => {
    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      {}
    )

    expect(mockGetActionsByLatestVersion).toHaveBeenCalledWith(logger, {})
    expect(mockGetActionBySemanticVersion).not.toHaveBeenCalled()
    expect(mockExecutePaymentMethod).toHaveBeenCalledWith(
      createMockAction().paymentMethod,
      { data: calcData }
    )
    expect(result.rateVersion).toEqual({ value: null, source: 'latest' })
  })

  it('returns an error when no enabled WMP config exists at all', async () => {
    mockGetActionsByLatestVersion.mockResolvedValue([
      { ...createMockAction(), code: 'CMOR1' }
    ])

    const result = await calculateWMPPaymentWithRateVersion(
      logger,
      {},
      calcData,
      {}
    )

    expect(result.error).toBe('Action not found')
    expect(mockExecutePaymentMethod).not.toHaveBeenCalled()
  })
})
