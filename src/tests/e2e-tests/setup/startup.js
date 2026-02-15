import { ingestLandData } from '~/scripts/local-ingest-service.js'
import {
  startTestServer,
  getBaseUrl
} from '~/src/tests/e2e-tests/setup/server.js'
import { setBaseUrl } from '~/src/tests/e2e-tests/setup/http-client.js'
import { mockApiCalls } from '~/src/tests/e2e-tests/setup/mocks.js'

let isSeeded = false

export default async () => {
  mockApiCalls()

  if (!isSeeded) {
    await ingestLandData()
    isSeeded = true
  }

  await startTestServer()

  setBaseUrl(getBaseUrl())
}
