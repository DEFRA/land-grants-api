async function getLandCoversByParcelId(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    logger.info(`Retrieving land covers for ${sheetId}-${parcelId}`)

    const query = `select * from land.land_covers where sheet_id = $1 and parcel_id = $2`
    const values = [sheetId, parcelId]
    const result = await client.query(query, values)

    logger.info(
      `Retrieved land covers for ${sheetId}-${parcelId} , ${result.rows}`
    )

    return result.rows
  } catch (error) {
    logger.error('Error executing get land covers by parcel id query', error)
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLandCoversByParcelId }
