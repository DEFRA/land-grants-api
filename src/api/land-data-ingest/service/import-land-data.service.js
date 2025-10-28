import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'
import { getDBOptions, createDBPool } from '../../common/helpers/postgres.js'
import { readFile } from './read-file.js'

/**
 *
 * @param {ReadableStream} landParcelsStream
 */
export async function importLandParcels(landParcelsStream) {
  const connection = createDBPool(getDBOptions())
  const client = await connection.connect()

  try {
    await client.query(
      await readFile(
        '../../../../scripts/import-land-data/land_parcels/create_land_parcels_temp_table.sql'
      )
    )

    const pgStream = client.query(
      from(
        `COPY land_parcels_tmp FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
      )
    )

    await pipeline(landParcelsStream, pgStream)

    const result = await client.query(
      await readFile(
        '../../../../scripts/import-land-data/land_parcels/insert_land_parcels.sql'
      )
    )

    console.log('Land parcels imported successfully', result.rowCount)

    return true
  } catch (error) {
    console.error(`Failed to import land parcels: ${error.message}`)
    return false
  } finally {
    await client?.query('drop table land_parcels_tmp')
    await client?.end()
  }
}
