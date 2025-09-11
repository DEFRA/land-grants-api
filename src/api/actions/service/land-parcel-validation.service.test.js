import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateLandAction } from '~/src/api/actions/service/action-validation.service.js'

jest.mock('~/src/api/parcel/queries/getLandData.query.js')
jest.mock('~/src/api/actions/queries/getActions.query.js')
jest.mock('~/src/api/agreements/queries/getAgreementsForParcel.query.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')
jest.mock('~/src/api/actions/service/action-validation.service.js')

const mockLandAction = {
  sheetId: 'SX0679',
  parcelId: '9238',
  actions: [{ code: 'CMOR1', quantity: 1 }]
}
const mockRequest = {
  logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
  server: { postgresDb: { connect: jest.fn(), query: jest.fn() } }
}
const mockResult = {
  code: 'CMOR1',
  description: 'CMOR1 failed',
  sheetId: 'SX0679',
  parcelId: '9238',
  passed: false
}

describe('LandParcelValidationService', () => {
  const mockLandParcelData = [
    {
      parcel_id: '9238',
      sheet_id: 'SX0679',
      area_sqm: 10000
    }
  ]
  const mockActions = [
    {
      code: 'CMOR1',
      description: 'CMOR1 failed',
      sheetId: 'SX0679',
      parcelId: '9238'
    }
  ]
  const mockAgreements = [
    {
      code: 'UPL1',
      area: 100
    }
  ]
  const mockCompatibilityCheckFn = jest.fn()
  const mockValidateLandActionResult = {
    results: [{ passed: false, message: 'CMOR1 failed' }]
  }

  beforeEach(() => {
    jest.clearAllMocks()

    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(mockActions)
    getAgreementsForParcel.mockResolvedValue(mockAgreements)
    createCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    validateLandAction.mockResolvedValue(mockValidateLandActionResult)
  })

  it('should validate land parcel actions', async () => {
    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(mockActions)
    getAgreementsForParcel.mockResolvedValue(mockAgreements)
    createCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    validateLandAction.mockResolvedValue(mockValidateLandActionResult)

    const result = await validateLandParcelActions(mockLandAction, mockRequest)

    expect(result).toEqual([mockResult])
  })

  it('should validate multiple land parcel actions', async () => {
    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(mockActions)
    getAgreementsForParcel.mockResolvedValue(mockAgreements)
    createCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    validateLandAction.mockResolvedValueOnce(mockValidateLandActionResult)
    validateLandAction.mockResolvedValueOnce({
      results: [{ passed: false, message: 'UPL1 failed' }]
    })

    const mockLandAction = {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [
        { code: 'CMOR1', quantity: 1 },
        { code: 'UPL1', quantity: 1 }
      ]
    }

    const result = await validateLandParcelActions(mockLandAction, mockRequest)

    expect(result).toEqual([
      mockResult,
      {
        code: 'UPL1',
        description: 'UPL1 failed',
        sheetId: 'SX0679',
        parcelId: '9238',
        passed: false
      }
    ])
  })

  it('should throw if no land parcel data is found', async () => {
    getLandData.mockResolvedValue(null)

    await expect(
      validateLandParcelActions(mockLandAction, mockRequest)
    ).rejects.toThrow('Land parcel not found: SX0679 9238')
  })

  it('should throw if no enabled actions are found', async () => {
    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(null)

    await expect(
      validateLandParcelActions(mockLandAction, mockRequest)
    ).rejects.toThrow('Actions not found')
  })
})
