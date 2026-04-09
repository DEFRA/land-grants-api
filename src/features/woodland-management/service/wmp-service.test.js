import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateWoodlandManagementPlan } from './wmp-service.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

vi.mock('~/src/features/parcel/service/parcel.service.js')
vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('~/src/features/rules-engine/rulesEngine.js')
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({ rules: [] }))
vi.mock('../../actions/queries/getEnabledActions.query.js')

const mockParcels = [{ area: 100 }, { area: 100 }]

describe('validateWoodlandManagementPlan', () => {
  let mockRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = {
      payload: {
        parcelIds: ['parcel1', 'parcel2'],
        oldWoodlandAreaHa: 10,
        newWoodlandAreaHa: 5
      },
      logger: {
        info: vi.fn(),
        error: vi.fn()
      },
      server: {
        postgresDb: {}
      }
    }
  })

  it('should calculate total area correctly and successfully validate woodland management plan', async () => {
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }])
    executeRules.mockReturnValue({ passed: true, results: [] })

    const result = await validateWoodlandManagementPlan(
      mockParcels,
      mockRequest
    )

    expect(getEnabledActions).toHaveBeenCalledWith(
      mockRequest.logger,
      mockRequest.server.postgresDb
    )

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      { oldWoodlandAreaHa: 10, newWoodlandAreaHa: 5, totalParcelAreaSqm: 200 },
      ['ruleA']
    )

    expect(result).toEqual({
      action: { code: 'PA3', rules: ['ruleA'] },
      ruleResult: { passed: true, results: [] }
    })
  })

  it('should default total area to 0 when no parcels are provided', async () => {
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }])
    executeRules.mockReturnValue({ passed: true, results: [] })

    const result = await validateWoodlandManagementPlan(null, mockRequest)

    expect(getEnabledActions).toHaveBeenCalledWith(
      mockRequest.logger,
      mockRequest.server.postgresDb
    )

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      { oldWoodlandAreaHa: 10, newWoodlandAreaHa: 5, totalParcelAreaSqm: 0 },
      ['ruleA']
    )

    expect(result).toEqual({
      action: { code: 'PA3', rules: ['ruleA'] },
      ruleResult: { passed: true, results: [] }
    })
  })
})
