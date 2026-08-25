import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  resolveRateVersion,
  calculateWMPPaymentWithRateVersion
} from './wmp-rate-version.service.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionBySemanticVersion } from '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
import { executePaymentMethod } from '~/src/features/payments-engine/paymentsEngine.js'

vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionBySemanticVersion.query.js'
)
vi.mock('~/src/features/payments-engine/paymentsEngine.js')

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

describe('resolveRateVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the explicit version without touching the database', () => {
    const result = resolveRateVersion(logger, { version: '1.0.0' })

    expect(result).toEqual({ semanticVersion: '1.0.0', source: 'explicit' })
  })

  it('falls back to latest when no version is supplied', () => {
    const result = resolveRateVersion(logger, {})

    expect(result).toEqual({ semanticVersion: null, source: 'latest' })
    expect(logger.warn).toHaveBeenCalled()
  })

  it('falls back to latest when called with no arguments', () => {
    const result = resolveRateVersion(logger)

    expect(result).toEqual({ semanticVersion: null, source: 'latest' })
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

  it('calculates at the latest config when no version is supplied', async () => {
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
