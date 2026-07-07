import { stopTestServer } from './server.js'
import { connectToTestDatabase } from '../../db-tests/setup/postgres.js'

export default async () => {
  await stopTestServer()
  const connection = connectToTestDatabase()
  await connection.end()
}
