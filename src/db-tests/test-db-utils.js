import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'

let seedFile

export async function createTestDatabase() {
  const connectionConfig = {
    host: 'localhost',
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432
  }

  const connection = new Pool(connectionConfig)

  await connection.end()
}

export async function connectToTestDatbase() {
  // in watch mode run only once
  if (process.env.JEST_FIRST_RUN === 'yes') {
    await createTestDatabase()
  }

  const connectionConfig = {
    host: 'localhost',
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432
  }

  return new Pool(connectionConfig)
}

export async function seedDatabase(client) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  if (!seedFile) {
    seedFile = await readFile(resolve(__dirname, './seed.sql'), {
      encoding: 'utf8'
    })
  }
  await client.query(seedFile)
}

export async function resetDatabase(client) {
  // truncate all tables in the database
  // https://stackoverflow.com/a/12082038/1489487
  await client.query(`
      DO
      $func$
      BEGIN
        EXECUTE (
          SELECT 'TRUNCATE TABLE ' || string_agg(oid::regclass::text, ', ') || ' CASCADE'
            FROM pg_class
            WHERE relkind = 'r'
            AND relnamespace = 'public'::regnamespace
        );
      END
      $func$;
    `)
}
