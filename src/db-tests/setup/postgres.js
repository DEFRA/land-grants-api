import { Pool } from 'pg'
import { DB_CONFIG } from './jestSetup.js'

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}
