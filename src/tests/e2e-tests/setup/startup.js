import { config } from '~/src/config/index.js'
import { ingestLandData } from '~/scripts/local-ingest-service.js'
import {
  startTestServer,
  getBaseUrl
} from '~/src/tests/e2e-tests/setup/server.js'
import { mockApiCalls } from '~/src/tests/e2e-tests/setup/mocks.js'
import { setBaseUrl } from '~/src/tests/e2e-tests/setup/http-client.js'

let isSeeded = false

export default async () => {
  // TODO: Enable once we have a usable DAL stub for e2e tests
  config.set('featureFlags.useDal', false)
  mockApiCalls()

  if (!isSeeded) {
    await ingestLandData()
    isSeeded = true
  }

  await startTestServer()

  setBaseUrl(getBaseUrl())
}
