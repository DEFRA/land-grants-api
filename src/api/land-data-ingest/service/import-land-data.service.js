import { connectToTestDatbase } from '../../../db-tests/setup/postgres.js'
import { from } from 'pg-copy-streams'
import { pipeline } from 'node:stream/promises'

/**
 *
 * @param {ReadableStream} landParcelsStream
 */
export async function importLandParcels(landParcelsStream) {
  const connection = connectToTestDatbase()
  const client = await connection.connect()

  const pgStream = client.query(
    from(
      `COPY land_parcels FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',')`
    )
  )
  try {
    await pipeline(landParcelsStream, pgStream)
    console.log('Land parcels imported successfully')
  } catch (error) {
    throw new Error(`Failed to import land parcels: ${error.message}`)
  } finally {
    await client.end()
  }
}
