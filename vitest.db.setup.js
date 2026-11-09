import { ingestLandData } from './scripts/local-ingest-service.js'
import { connectToTestDatabase } from './src/tests/db-tests/setup/postgres.js'
import { insertTestSidedness } from './src/tests/db-tests/setup/actions-test-helpers.js'

let isSeeded = false

export default async () => {
  if (!isSeeded) {
    await ingestLandData()

    const connection = connectToTestDatabase()
    await insertTestSidedness(connection)
    await connection.end()

    isSeeded = true
  }
}
