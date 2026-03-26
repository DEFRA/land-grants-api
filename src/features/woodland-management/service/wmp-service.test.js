import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateWoodlandManagementPlan } from './wmp-service.js'
import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'
import { wmpResultTransformer } from './wmp.transformer.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

vi.mock('~/src/features/parcel/service/parcel.service.js')
vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('~/src/features/rules-engine/rulesEngine.js')
vi.mock('~/src/features/rules-engine/rules/index.js', () => ({ rules: [] }))
vi.mock('../../actions/queries/getEnabledActions.query.js')
vi.mock('./wmp.transformer.js')

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
    splitParcelId.mockImplementation((id) => ({
      sheetId: 'sheet',
      parcelId: id
    }))
    getLandData.mockResolvedValue([{ area: 100 }])
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }])
    executeRules.mockReturnValue({ passed: true, results: [] })
    wmpResultTransformer.mockReturnValue({ hasPassed: true })

    const result = await validateWoodlandManagementPlan(mockRequest)

    expect(splitParcelId).toHaveBeenCalledTimes(2)
    expect(splitParcelId).toHaveBeenCalledWith('parcel1', mockRequest.logger)
    expect(splitParcelId).toHaveBeenCalledWith('parcel2', mockRequest.logger)

    expect(getLandData).toHaveBeenCalledTimes(2)
    expect(getLandData).toHaveBeenCalledWith(
      'sheet',
      'parcel1',
      mockRequest.server.postgresDb,
      mockRequest.logger
    )
    expect(getLandData).toHaveBeenCalledWith(
      'sheet',
      'parcel2',
      mockRequest.server.postgresDb,
      mockRequest.logger
    )

    expect(getEnabledActions).toHaveBeenCalledWith(
      mockRequest.logger,
      mockRequest.server.postgresDb
    )

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      { oldWoodlandAreaHa: 10, newWoodlandAreaHa: 5, totalParcelArea: 200 },
      ['ruleA']
    )

    expect(wmpResultTransformer).toHaveBeenCalledWith(
      { code: 'PA3', rules: ['ruleA'] },
      { passed: true, results: [] }
    )

    expect(result).toEqual({ hasPassed: true })
  })

  it('should ignore parcels with no land data when calculating total area', async () => {
    splitParcelId.mockImplementation((id) => ({
      sheetId: 'sheet',
      parcelId: id
    }))
    getLandData
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ area: 50 }])
    getEnabledActions.mockResolvedValue([{ code: 'PA3', rules: ['ruleA'] }])
    executeRules.mockReturnValue({ passed: true, results: [] })
    wmpResultTransformer.mockReturnValue({ hasPassed: true })

    const result = await validateWoodlandManagementPlan(mockRequest)

    expect(executeRules).toHaveBeenCalledWith(
      rules,
      { oldWoodlandAreaHa: 10, newWoodlandAreaHa: 5, totalParcelArea: 50 },
      ['ruleA']
    )
    expect(result).toEqual({ hasPassed: true })
  })
})
