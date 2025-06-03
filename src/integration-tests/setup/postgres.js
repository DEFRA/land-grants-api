import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { DB_CONFIG } from './jestDbSetup.js'

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}

export async function seedDatabase(client, seedFile) {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.resolve(path.dirname(filename), '../fixtures')
  const seedFileContent = await readFile(resolve(dirname, seedFile), {
    encoding: 'utf8'
  })
  await client.query(seedFileContent)
}

export async function resetDatabase(client) {
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
