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

const mockRequest = {
  logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
  server: { postgresDb: { connect: jest.fn(), query: jest.fn() } }
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
      parcelId: '9238',
      version: '1'
    },
    {
      code: 'UPL1',
      description: 'UPL1 failed',
      sheetId: 'SX0679',
      parcelId: '9238',
      version: '1'
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
    ruleResult: {
      results: [
        {
          passed: false,
          reason: 'CMOR1 failed',
          name: 'rule-name',
          explanations: [
            `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
          ]
        }
      ]
    },
    availableArea: {
      explanations: [
        `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
      ],
      areaInHa: 567
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(mockActions)
    getAgreementsForParcel.mockResolvedValue(mockAgreements)
    createCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    validateLandAction.mockResolvedValueOnce(mockValidateLandActionResult)
  })

  it('should validate land parcel actions', async () => {
    const mockLandAction = {
      sheetId: 'SX0671',
      parcelId: '9231',
      actions: [{ code: 'CMOR1', quantity: 1 }]
    }

    const result = await validateLandParcelActions(mockLandAction, mockRequest)

    expect(result).toEqual([
      {
        code: 'CMOR1',
        description: 'CMOR1 failed',
        sheetId: 'SX0671',
        parcelId: '9231',
        passed: false,
        rule: 'rule-name',
        actionConfigVersion: '1',
        availableArea: {
          explanations: [
            `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
          ],
          areaInHa: 567
        },
        explanations: [
          `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
        ]
      }
    ])
  })

  it('should validate multiple land parcel actions', async () => {
    validateLandAction.mockResolvedValueOnce({
      ruleResult: {
        results: [
          {
            passed: false,
            reason: 'UPL1 failed',
            name: 'rule-name',
            explanations: []
          }
        ]
      },
      availableArea: {
        explanations: [],
        areaInHa: 567
      }
    })

    const mockLandAction = {
      sheetId: 'SX0672',
      parcelId: '9232',
      actions: [
        { code: 'CMOR1', quantity: 1 },
        { code: 'UPL1', quantity: 1 }
      ]
    }

    const result = await validateLandParcelActions(mockLandAction, mockRequest)

    expect(result).toEqual([
      {
        code: 'CMOR1',
        description: 'CMOR1 failed',
        sheetId: 'SX0672',
        parcelId: '9232',
        passed: false,
        rule: 'rule-name',
        actionConfigVersion: '1',
        availableArea: {
          explanations: [
            `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
          ],
          areaInHa: 567
        },
        explanations: [
          `This parcel has a 100%  intersection with the moorland layer. The target is 51%.`
        ]
      },
      {
        code: 'UPL1',
        description: 'UPL1 failed',
        sheetId: 'SX0672',
        parcelId: '9232',
        passed: false,
        rule: 'rule-name',
        actionConfigVersion: '1',
        availableArea: {
          explanations: [],
          areaInHa: 567
        },
        explanations: []
      }
    ])
  })

  it('should throw if no land parcel data is found', async () => {
    getLandData.mockResolvedValue(null)

    const mockLandAction = {
      sheetId: 'SX0673',
      parcelId: '9233',
      actions: [{ code: 'CMOR1', quantity: 1 }]
    }

    await expect(
      validateLandParcelActions(mockLandAction, mockRequest)
    ).rejects.toThrow('Land parcel not found: SX0673 9233')
  })

  it('should throw if no enabled actions are found', async () => {
    getLandData.mockResolvedValue(mockLandParcelData)
    getEnabledActions.mockResolvedValue(null)

    const mockLandAction = {
      sheetId: 'SX0674',
      parcelId: '9234',
      actions: [{ code: 'CMOR1', quantity: 1 }]
    }

    await expect(
      validateLandParcelActions(mockLandAction, mockRequest)
    ).rejects.toThrow('Actions not found')
  })
})
