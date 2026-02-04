import { createServer } from '~/src/api/index.js'
import { config } from '~/src/config/index.js'
import { TEST_PORT } from './test-config.js'

let serverInstance = null

export async function startTestServer() {
  if (serverInstance) {
    return serverInstance
  }

  config.load({ port: TEST_PORT })

  serverInstance = await createServer()
  await serverInstance.start()

  return serverInstance
}

export async function stopTestServer() {
  if (serverInstance) {
    await serverInstance.stop()
    serverInstance = null
  }
}

export function getTestServer() {
  return serverInstance
}

export function getBaseUrl() {
  return `http://localhost:${TEST_PORT}`
}
