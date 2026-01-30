import { connectToTestDatbase } from '../../src/tests/db-tests/setup/postgres.js'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const connection = connectToTestDatbase()

const readFile = async (path) => {
  return await fs.readFile(join(__dirname, path), 'utf8')
}

const getTableCsvFiles = async (name) => {
  const files = await fs.readdir(__dirname)
  return files.filter((f) => f.startsWith(name) && f.endsWith('.csv'))
}

const copyCsvToTable = async (client, table, csvFile) => {
  console.log('copying csv to table', table, csvFile)
  const fileStream = createReadStream(join(__dirname, csvFile))
  const pgStream = client.query(
    from(
      `COPY ${table}_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
    )
  )
  try {
    await pipeline(fileStream, pgStream)
    console.log('CSV data copy completed successfully')
  } catch (error) {
    console.error('Error during copy:', error)
  }
}

const insertParcels = async (client) => {
  console.log('inserting parcels')
  await client.query(
    await readFile('land_parcels/create_land_parcels_temp_table.sql')
  )

  const landParcelsFiles = await getTableCsvFiles('parcels')
  for (const file of landParcelsFiles) {
    await copyCsvToTable(client, 'land_parcels', file)
  }

  await client.query(`
    truncate table land_parcels;
  `)

  await client.query(await readFile('land_parcels/insert_land_parcels.sql'))

  await client.query(`
    drop table land_parcels_tmp;
  `)

  console.log('parcels inserted')
}

const insertCovers = async (client) => {
  console.log('inserting covers')
  await client.query(
    await readFile('land_covers/create_land_covers_temp_table.sql')
  )

  const landParcelsFiles = await getTableCsvFiles('covers')
  for (const file of landParcelsFiles) {
    await copyCsvToTable(client, 'land_covers', file)
  }

  await client.query(`
    truncate table land_covers;
  `)

  await client.query(await readFile('land_covers/insert_land_covers.sql'))

  await client.query(`
    drop table land_covers_tmp;
  `)

  console.log('covers inserted')
}

const insertMoorland = async (client) => {
  console.log('inserting moorland')
  await client.query(
    await readFile(
      'moorland_designations/create_moorland_designations_temp_table.sql'
    )
  )

  const landParcelsFiles = await getTableCsvFiles('moorland')
  for (const file of landParcelsFiles) {
    await copyCsvToTable(client, 'moorland_designations', file)
  }

  await client.query(`
    truncate table moorland_designations;
  `)

  await client.query(
    await readFile('moorland_designations/insert_moorland_designations.sql')
  )

  await client.query(`
    drop table moorland_designations_tmp;
  `)

  console.log('moorland inserted')
}

const importLandData = async () => {
  const client = await connection.connect()

  await insertParcels(client)
  await insertCovers(client)
  await insertMoorland(client)

  await client.end()
}

importLandData()
