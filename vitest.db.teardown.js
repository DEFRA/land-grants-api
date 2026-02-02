import { connectToTestDatbase } from './src/db-tests/setup/postgres.js'

export default async () => {
  const connection = connectToTestDatbase()
  await connection.end()
}
