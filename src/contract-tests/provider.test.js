import { env } from 'node:process'
import dotenv from 'dotenv'
import { Verifier } from '@pact-foundation/pact'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'

import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import Hapi from '@hapi/hapi'
import { mockActionConfig } from '~/src/api/actions/fixtures/index.js'
import { parcel } from '~/src/api/parcel/index.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { logger } from '~/src/db-tests/testLogger.js'
import { getEnabledActions } from '~/src/api/actions/queries/index.js'

jest.mock('~/src/api/parcel/queries/getLandData.query.js')
jest.mock('~/src/api/actions/queries/index.js')
jest.mock('~/src/available-area/compatibilityMatrix.js')
jest.mock('~/src/available-area/availableArea.js')
jest.mock('~/src/api/land-cover-codes/queries/getLandCoversForActions.query.js')
jest.mock('~/src/api/agreements/queries/getAgreementsForParcel.query.js')

const mockGetLandData = getLandData
const mockGetEnabledActions = getEnabledActions
const mockCreateCompatibilityMatrix = createCompatibilityMatrix
const mockGetAvailableAreaForAction = getAvailableAreaForAction
const mockGetAgreementsForParcel = getAgreementsForParcel
const mockGetAvailableAreaDataRequirements = getAvailableAreaDataRequirements

const mockCompatibilityCheckFn = jest.fn()

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

const pactVerifierOptions = {
  provider: 'land-grants-api',
  providerBaseUrl: 'http://localhost:3001',
  pactBrokerUrl:
    env.PACT_BROKER_URL ?? 'https://ffc-pact-broker.azure.defra.cloud',
  consumerVersionSelectors: [{ latest: true }],
  pactBrokerUsername: env.PACT_BROKER_USERNAME,
  pactBrokerPassword: env.PACT_BROKER_PASSWORD,
  publishVerificationResult: true,
  providerVersion: process.env.GIT_COMMIT ?? '1.0.0',

  stateHandlers: {
    'has a parcel with ID': ({ sheetId, parcelId }) => {
      const parcel = createParcel(sheetId, parcelId)
      mockGetLandData.mockResolvedValue([parcel])
    }
  },

  beforeEach: () => {
    mockGetEnabledActions.mockResolvedValue(mockActionConfig)

    mockGetAvailableAreaDataRequirements.mockResolvedValue({
      landCoverCodesForAppliedForAction: [],
      landCoversForParcel: [],
      landCoversForExistingActions: []
    })
    mockCreateCompatibilityMatrix.mockResolvedValue(mockCompatibilityCheckFn)
    mockGetAvailableAreaForAction.mockReturnValue(mockAvailableAreaResult)
    mockGetAgreementsForParcel.mockResolvedValue([])
  },

  afterEach: () => {
    jest.clearAllMocks()
  }
}

describe('Pact Verification', () => {
  const server = Hapi.server({ port: 3001, host: 'localhost' })

  beforeAll(async () => {
    server.decorate('request', 'logger', logger)
    server.decorate('server', 'postgresDb', {
      connect: jest.fn(),
      query: jest.fn()
    })
    await server.register([parcel])
    await server.initialize()
    await server.start()
  })

  afterAll(async () => {
    await server.stop()
  })

  it('validates the expectations of Matching Service', async () => {
    const results = await new Verifier(pactVerifierOptions).verifyProvider()
    expect(results).toBeTruthy()
  })
})
