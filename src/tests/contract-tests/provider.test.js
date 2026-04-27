import { env } from 'node:process'

import dotenv from 'dotenv'
import { Verifier } from '@pact-foundation/pact'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { getAgreementsForParcel } from '~/src/features/agreements/queries/getAgreementsForParcel.query.js'
import {
  mockActionConfig,
  mockWoodlandManagementActionConfig
} from '~/src/features/actions/fixtures/index.js'
import { parcel } from '~/src/features/parcel/index.js'
import { payments } from '~/src/features/payment/index.js'
import { application } from '~/src/features/application/index.js'
import { woodlandManagement } from '~/src/features/woodland-management/index.js'
import { caseManagementAdapter } from '~/src/features/case-management-adapter/index.js'
import { getAvailableAreaDataRequirements } from '~/src/features/available-area/availableAreaDataRequirements.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { formatExplanationSections } from '~/src/features/available-area/explanations.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { logger } from '~/src/tests/db-tests/setup/testLogger.js'
import { getEnabledActions } from '~/src/features/actions/queries/getEnabledActions.query.js'
import { getActionsByLatestVersion } from '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'
import { saveApplication } from '~/src/features/application/mutations/saveApplication.mutation.js'
import { getLatestVersion } from './git.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'
import { applicationValidationRunToCaseManagement } from '~/src/features/case-management-adapter/transformers/application-validation.transformer.js'
import { validateApplication } from '~/src/features/application/service/application-validation.service.js'
import { splitParcelId } from '~/src/features/parcel/service/2.0.0/parcel.service.js'
import createTestServer from '../test-server.js'

vi.mock('~/src/features/parcel/queries/getLandData.query.js')
vi.mock('~/src/features/actions/queries/getEnabledActions.query.js')
vi.mock(
  '~/src/features/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
)
vi.mock('~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js')
vi.mock('~/src/features/application/mutations/saveApplication.mutation.js')
vi.mock('~/src/features/available-area/compatibilityMatrix.js')
vi.mock('~/src/features/available-area/availableAreaDataRequirements.js')
vi.mock('~/src/features/available-area/availableArea.js')
vi.mock(
  '~/src/features/available-area/explanations.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      formatExplanationSections: vi.fn()
    }
  }
)
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
const mockGetActionsByVersion = getActionsByVersion
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockFindMaximumAvailableArea = findMaximumAvailableArea
const mockFormatExplanationSections = formatExplanationSections
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockSaveApplication = saveApplication
const mockCompatibilityCheckFn = vi.fn()
const mockGetApplicationValidationRun = getApplicationValidationRun
const mockApplicationValidationRunToCaseManagement =
  applicationValidationRunToCaseManagement
const mockValidateApplication = validateApplication

const mockLpResult = {
  feasible: true,
  context: null,
  totalValidLandCoverSqm: 300,
  availableAreaSqm: 300,
  availableAreaHectares: 0.03
}

const mockGetApplicationValidationRunResult = (logger, db, id) => {
  if (id === 999) {
    return null
  }
  return {
    id,
    sbi: 123456,
    crn: '123456',
    application_id: id,
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

/* eslint-disable no-unused-vars, @typescript-eslint/require-await */
const mockValidateApplicationResult = async (_, applicationId) => {
  const validationErrors = applicationId === 456 ? [{ error: 'error' }] : []
  return {
    validationErrors,
    applicationData: {
      hasPassed: true,
      date: '2026-02-23T11:09:46.263Z'
    },
    applicationValidationRunId: 1
  }
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

const pactConfigCi = () => {
  return {
    pactBrokerUrl:
      env.PACT_BROKER_URL ?? 'https://ffc-pact-broker.azure.defra.cloud',
    consumerVersionSelectors: [{ latest: true }],
    pactBrokerUsername: env.PACT_BROKER_USERNAME,
    pactBrokerPassword: env.PACT_BROKER_PASSWORD,
    publishVerificationResult: env.PACT_PUBLISH_VERIFICATION === 'true'
  }
}

const pactConfigLocal = () => {
  return {
    pactUrls: [
      '../grants-ui/src/contracts/pacts/grants-ui-land-grants-api.json'
    ],
    publishVerificationResult: false
  }
}

const pactVerifierOptions = async () => {
  const isLocal = false
  const latestVersion = await getLatestVersion()
  const config = isLocal ? pactConfigLocal() : pactConfigCi()
  return {
    provider: 'land-grants-api',
    providerBaseUrl: 'http://localhost:3001',
    providerVersion: latestVersion,
    ...config,
    stateHandlers: {
      'has parcels': ({ parcels }) => {
        const allParcels = []
        parcels.forEach(({ sheetId, parcelId }) => {
          const parcel = createParcel(sheetId, parcelId)
          allParcels.push(parcel)
        })
        mockGetLandData.mockResolvedValue(allParcels)
      },
      'has woodland parcels': ({ parcelIds }) => {
        const { sheetId, parcelId } = splitParcelId(parcelIds[0], logger)
        const allParcels = []
        const parcel = createParcel(sheetId, parcelId)
        allParcels.push(parcel)
        mockGetLandData.mockResolvedValue(allParcels)
      }
    },

    beforeEach: () => {
      const actions = [
        ...mockActionConfig,
        ...mockWoodlandManagementActionConfig
      ]
      mockGetEnabledActions.mockResolvedValue(actions)
      mockGetActionsByLatestVersion.mockResolvedValue(actions)
      mockGetActionsByVersion.mockResolvedValue(actions)
      mockGetAvailableAreaDataRequirements.mockResolvedValue({
        landCoverCodesForAppliedForAction: [],
        landCoversForParcel: [],
        landCoversForExistingActions: [],
        landCoverToString: () => ''
      })
      mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
      mockFindMaximumAvailableArea.mockReturnValue(mockLpResult)
      mockFormatExplanationSections.mockReturnValue([])
      mockGetAgreementsForParcel.mockResolvedValue([])
      mockSaveApplication.mockResolvedValue(251)
      mockGetApplicationValidationRun.mockImplementation(
        mockGetApplicationValidationRunResult
      )
      mockApplicationValidationRunToCaseManagement.mockReturnValue(
        mockValidationRunToCaseManagementResult
      )
      mockValidateApplication.mockImplementation(mockValidateApplicationResult)
    },

    afterEach: () => {
      vi.clearAllMocks()
    }
  }
}

describe('Pact Verification', () => {
  const server = createTestServer()

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
      caseManagementAdapter,
      woodlandManagement
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
