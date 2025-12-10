import { Pool } from 'pg'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'url'
import path from 'node:path'

import { DB_CONFIG } from './jestSetup.js'
const fixtureDirPath = '../fixtures'

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}

export async function runSqlScript(client, seedFile, folderPath) {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.resolve(path.dirname(filename), folderPath)
  const seedFileContent = await readFile(path.join(dirname, seedFile), 'utf8')
  await client.query(seedFileContent)
}

export async function seedForParcelControllerTest(connection) {
  await runSqlScript(
    connection,
    'parcel-controller-int-test-data.sql',
    fixtureDirPath
  )
}

export async function resetParcelControllerTestData(connection) {
  await runSqlScript(
    connection,
    'parcel-controller-int-test-data-down.sql',
    fixtureDirPath
  )
}

export async function seedForGetParcelTest(connection) {
  await runSqlScript(connection, 'getParcel-test-data.sql', fixtureDirPath)
}

export async function resetGetParcelTestData(connection) {
  await runSqlScript(connection, 'getParcel-test-data-down.sql', fixtureDirPath)
}

export async function seedForAgreementsTest(connection) {
  await runSqlScript(connection, 'getAgreements-test-data.sql', fixtureDirPath)
}

export async function resetAgreementsTestData(connection) {
  await runSqlScript(
    connection,
    'getAgreements-test-data-down.sql',
    fixtureDirPath
  )
}
