import { resolve } from 'node:path'
import path from 'path'
import { fileURLToPath } from 'url'
import { Pool } from 'pg'
import { DB_CONFIG } from './jestSetup.js'
import { readCompressedFileStream } from '../../api/common/helpers/compression.js'

export const connectToTestDatbase = () => {
  return new Pool({
    ...DB_CONFIG,
    port: Number(process.env.POSTGRES_PORT)
  })
}

export async function seedPostgres(connection, options) {
  const migrationPath = '../../api/common/migration'

  if (options.parcels) {
    await seedDatabase(connection, 'land-parcels-data.sql.gz', migrationPath)
  }

  if (options.covers) {
    await seedDatabase(connection, 'land-covers-data.sql.gz', migrationPath)
  }

  if (options.landCoverCodes) {
    await seedDatabase(
      connection,
      'land-cover-codes-data.sql.gz',
      migrationPath
    )
  }

  if (options.landCoverCodesActions) {
    await seedDatabase(
      connection,
      'land-cover-codes-actions-data.sql.gz',
      migrationPath
    )
  }

  if (options.agreements) {
    await seedDatabase(connection, 'agreements-data.sql.gz', '../fixtures')
  }

  if (options.moorland) {
    await seedDatabase(
      connection,
      'moorland-designations-data.sql.gz',
      migrationPath
    )
  }
}

export async function seedDatabase(client, seedFile, folderPath) {
  const filename = fileURLToPath(import.meta.url)
  const dirname = path.resolve(path.dirname(filename), folderPath)
  const seedFileContent = await readCompressedFileStream(
    resolve(dirname, seedFile)
  )
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
