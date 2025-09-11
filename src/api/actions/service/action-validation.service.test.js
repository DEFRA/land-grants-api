import { validateLandAction } from './action-validation.service.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'

jest.mock('~/src/api/parcel/queries/getMoorlandInterceptPercentage.js')
jest.mock('~/src/available-area/availableArea.js')
jest.mock('~/src/rules-engine/rulesEngine.js')

describe('Action Validation Service', () => {
  const mockAction = {
    code: 'CMOR1',
    quantity: 100
  }
  const mockParcelDetails = {
    sheetId: 'SX0679',
    parcelId: '9238'
  }
  const mockAgreements = {
    agreements: [{ area: 100, code: 'UPL1' }]
  }
  const mockPlannedActions = {
    actions: [{ code: 'CMOR1', quantity: 99.0 }]
  }
  const mockCompatibilityCheckFn = jest.fn()
  const mockAllEnabledActions = [
    { code: 'CMOR1', rules: ['applied-for-total-available-area'] }
  ]
  const mockRequest = {
    logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    server: { postgresDb: { connect: jest.fn(), query: jest.fn() } }
  }
  const mockAacDataRequirements = {
    landCoverCodesForAppliedForAction: [],
    landCoversForParcel: [],
    landCoversForExistingActions: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    getAvailableAreaDataRequirements.mockResolvedValue(mockAacDataRequirements)
    getAvailableAreaForAction.mockReturnValue({
      availableAreaSqm: 567,
      totalValidLandCoverSqm: 1000
    })
    getMoorlandInterceptPercentage.mockResolvedValue(50)
    executeRules.mockReturnValue({
      passed: true,
      results: []
    })
  })

  it('should return a validation result', async () => {
    const result = await validateLandAction(
      mockAction,
      mockParcelDetails,
      mockAgreements,
      mockPlannedActions,
      mockCompatibilityCheckFn,
      mockAllEnabledActions,
      mockRequest
    )

    expect(result).toEqual({
      passed: true,
      results: []
    })
    expect(getAvailableAreaDataRequirements).toHaveBeenCalledWith(
      mockAction.code,
      mockParcelDetails.sheetId,
      mockParcelDetails.parcelId,
      mockPlannedActions,
      mockRequest.server.postgresDb,
      mockRequest.logger
    )
    expect(getAvailableAreaForAction).toHaveBeenCalledWith(
      mockAction.code,
      mockParcelDetails.sheetId,
      mockParcelDetails.parcelId,
      mockCompatibilityCheckFn,
      mockPlannedActions,
      mockAacDataRequirements,
      mockRequest.logger
    )
    expect(getMoorlandInterceptPercentage).toHaveBeenCalledWith(
      mockParcelDetails.sheetId,
      mockParcelDetails.parcelId,
      mockRequest.server.postgresDb,
      mockRequest.logger
    )
  })
})
