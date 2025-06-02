import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import path from 'path'
import { fileURLToPath } from 'url'
import { DB_CONFIG } from './jestDbSetup.js'

let seedFile

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}

export async function seedDatabase(client) {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)
  if (!seedFile) {
    seedFile = await readFile(resolve(dirname, './seed.sql'), {
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
