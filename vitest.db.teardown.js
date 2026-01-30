import {
  connectToTestDatbase,
  clearSeedDatabaseForTests
} from './src/tests/db-tests/setup/postgres.js'

export default async () => {
  const connection = connectToTestDatbase()
  await clearSeedDatabaseForTests(connection)
  await connection.end()
}
