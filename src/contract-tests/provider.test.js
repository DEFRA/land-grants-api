import { env } from 'node:process'

import dotenv from 'dotenv'
import { Verifier } from '@pact-foundation/pact'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import Hapi from '@hapi/hapi'
import { mockActionConfig } from '~/src/api/actions/fixtures/index.js'
import { parcel } from '~/src/api/parcel/index.js'
import { payments } from '~/src/api/payment/index.js'
import { application } from '~/src/api/application/index.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { logger } from '~/src/db-tests/setup/testLogger.js'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { getActionsByLatestVersion } from '~/src/api/actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { saveApplication } from '~/src/api/application/mutations/saveApplication.mutation.js'
import { getLatestVersion } from './git.js'

vi.mock('~/src/api/parcel/queries/getLandData.query.js')
vi.mock('~/src/api/actions/queries/getActions.query.js')
vi.mock('~/src/api/actions/queries/2.0.0/getActionsByLatestVersion.query.js')
vi.mock('~/src/api/application/mutations/saveApplication.mutation.js')
vi.mock('~/src/available-area/compatibilityMatrix.js')
vi.mock('~/src/available-area/availableArea.js')
vi.mock('~/src/api/land-cover-codes/queries/getLandCoversForActions.query.js')
vi.mock('~/src/api/agreements/queries/getAgreementsForParcel.query.js')

const mockGetLandData = getLandData
const mockGetActionsByLatestVersion = getActionsByLatestVersion
const mockGetEnabledActions = getEnabledActions
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockGetAvailableAreaForAction = getAvailableAreaForAction
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements
const mockSaveApplication = saveApplication
const mockCompatibilityCheckFn = vi.fn()

const mockAvailableAreaResult = {
  stacks: [],
  explanations: [],
  totalValidLandCoverSqm: 300,
  availableAreaSqm: 300,
  availableAreaHectares: 0.03
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
    await server.register([parcel, payments, application])
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
