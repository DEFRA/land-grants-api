import { env } from 'node:process'

import dotenv from 'dotenv'
import { Verifier } from '@pact-foundation/pact'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { getAgreementsForParcel } from '~/src/features/agreements/queries/getAgreementsForParcel.query.js'
import Hapi from '@hapi/hapi'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'
import { parcel } from '~/src/features/parcel/index.js'
import { payments } from '~/src/features/payment/index.js'
import { application } from '~/src/features/application/index.js'
import { caseManagementAdapter } from '~/src/features/case-management-adapter/index.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/features/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import { getEnabledActions } from '~/src/features/actions/queries/getActions.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { saveApplication } from '~/src/features/application/mutations/saveApplication.mutation.js'
import { getLatestVersion } from './git.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'
import { applicationValidationRunToCaseManagement } from '~/src/features/case-management-adapter/transformers/application-validation.transformer.js'
import { validateApplication } from '~/src/features/application/service/application-validation.service.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('~/src/features/actions/queries/getActions.query.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock('~/src/features/application/mutations/saveApplication.mutation.js')
vi.mock('~/src/features/available-area/compatibilityMatrix.js')
vi.mock('~/src/features/available-area/availableArea.js')
vi.mock(
  '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
)
vi.mock('~/src/features/agreements/queries/getAgreementsForParcel.query.js')
vi.mock(
  '~/src/features/application/queries/getApplicationValidationRun.query.js'
)
vi.mock(
  '~/src/features/case-management-adapter/transformers/application-validation.transformer.js'
)
vi.mock('~/src/features/application/service/application-validation.service.js')

const mockGetLandData = getLandData
const mockGetActionsByLatestVersion = getActionsByLatestVersion
const mockGetEnabledActions = getEnabledActions
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockGetAvailableAreaForAction = getAvailableAreaForAction
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockSaveApplication = saveApplication
const mockCompatibilityCheckFn = vi.fn()
const mockGetApplicationValidationRun = getApplicationValidationRun
const mockApplicationValidationRunToCaseManagement =
  applicationValidationRunToCaseManagement
const mockValidateApplication = validateApplication

const mockAvailableAreaResult = {
  stacks: [],
  explanations: [],
  totalValidLandCoverSqm: 300,
  availableAreaSqm: 300,
  availableAreaHectares: 0.03
}

// eslint-disable-next-line
const mockGetApplicationValidationRunResult = async (logger, db, id) => {
  if (id === 999) {
    return null
  }
  return {
    id,
    sbi: 123456,
    crn: '123456',
    application_id: 1,
    validation_run_id: 1,
    data: {
      application_id: 1,
      application: {
        parcels: []
      }
    }
  }
}

const mockValidationRunToCaseManagementResult = [
  {
    component: 'heading',
    text: 'Land parcel rules checks',
    level: 2,
    id: '1'
  },
  {
    component: 'heading',
    text: 'Parcel ID: SD6743 8083 checks',
    level: 3,
    id: undefined
  }
]

const mockValidateApplicationResult = {
  validationErrors: [],
  applicationData: {
    hasPassed: true,
    date: '2026-02-23T11:09:46.263Z'
  },
  applicationValidationRunId: 1
}

dotenv.config()

function createParcel(sheetId, parcelId) {
  return {
    parcel_id: parcelId,
    sheet_id: sheetId,
    area_sqm: 440,
    geom: 'POLYGON((...))'
  }
}

const pactVerifierOptions = async () => {
  const latestVersion = await getLatestVersion()
  return {
    provider: 'land-grants-api',
    providerBaseUrl: 'http://localhost:3001',
    pactBrokerUrl:
      env.PACT_BROKER_URL ?? 'https://ffc-pact-broker.azure.defra.cloud',
    consumerVersionSelectors: [{ latest: true }],
    pactBrokerUsername: env.PACT_BROKER_USERNAME,
    pactBrokerPassword: env.PACT_BROKER_PASSWORD,
    publishVerificationResult: env.PACT_PUBLISH_VERIFICATION === 'true',
    providerVersion: latestVersion,

    stateHandlers: {
      'has parcels': ({ parcels }) => {
        const allParcels = []
        parcels.forEach(({ sheetId, parcelId }) => {
          const parcel = createParcel(sheetId, parcelId)
          allParcels.push(parcel)
        })
        mockGetLandData.mockResolvedValue(allParcels)
      }
    },

    beforeEach: () => {
      mockGetEnabledActions.mockResolvedValue(mockActionConfig)
      mockGetActionsByLatestVersion.mockResolvedValue(mockActionConfig)

      mockGetAvailableAreaDataRequirements.mockResolvedValue({
        landCoverCodesForAppliedForAction: [],
        landCoversForParcel: [],
        landCoversForExistingActions: []
      })
      mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
      mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
      mockGetAgreementsForParcel.mockResolvedValue([])
      mockSaveApplication.mockResolvedValue(251)
      mockGetApplicationValidationRun.mockImplementation(
        mockGetApplicationValidationRunResult
      )
      mockApplicationValidationRunToCaseManagement.mockReturnValue(
        mockValidationRunToCaseManagementResult
      )
      mockValidateApplication.mockResolvedValue(mockValidateApplicationResult)
    },

    afterEach: () => {
      vi.clearAllMocks()
    }
  }
}

describe('Pact Verification', () => {
  const server = Hapi.server({ port: 3001, host: 'localhost' })

  beforeAll(async () => {
    server.decorate('request', 'logger', logger)
    server.decorate('server', 'postgresDb', {
      connect: vi.fn(),
      query: vi.fn()
    })
    await server.register([
      parcel,
      payments,
      application,
      caseManagementAdapter
    ])
    await server.initialize()
    await server.start()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('validates the expectations of Matching Service', async () => {
    const options = await pactVerifierOptions()
    const results = await new Verifier(options).verifyProvider()
    expect(results).toBeTruthy()
  }, 30000)
})
