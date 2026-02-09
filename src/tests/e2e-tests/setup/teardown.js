import { stopTestServer } from './server.js'
import { connectToTestDatbase } from '../../db-tests/setup/postgres.js'

export default async () => {
  await stopTestServer()
  const connection = connectToTestDatbase()
  await connection.end()
}
