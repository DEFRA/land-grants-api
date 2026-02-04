import { Pool } from 'pg'
import { DB_CONFIG } from './test-config.js'

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}

export async function truncateTable(client, table) {
  await client.query(`TRUNCATE TABLE ${table} CASCADE`)
}
