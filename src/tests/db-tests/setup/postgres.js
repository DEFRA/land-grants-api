import { Pool } from 'pg'
import { DB_CONFIG } from './test-config.js'

export const connectToTestDatabase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}
