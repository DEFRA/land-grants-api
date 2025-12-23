import {
  connectToTestDatbase,
  seedDatabaseForTests
} from './src/db-tests/setup/postgres.js'

let isSeeded = false

export default async () => {
  if (!isSeeded) {
    const connection = connectToTestDatbase()
    await seedDatabaseForTests(connection)
    await connection.end()
    isSeeded = true
  }
}
