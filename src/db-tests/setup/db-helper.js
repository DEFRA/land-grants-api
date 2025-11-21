export const getRecord = async (connection, tableName, sheetId, parcelId) => {
  const client = await connection.connect()
  const result = await client.query(
    `SELECT * FROM ${tableName} WHERE sheet_id = $1 AND parcel_id = $2`,
    [sheetId, parcelId]
  )
  await client.release()
  return result?.rows?.[0] || null
}

export const clearTestData = async (connection) => {
  const client = await connection.connect()
  await client.query(`DELETE FROM land_parcels WHERE sheet_id = $1`, ['TV5797'])
  await client.query(`DELETE FROM land_covers WHERE sheet_id = $1`, ['TV5699'])
  await client.query(
    `DELETE FROM moorland_designations WHERE lfa_moor_id = $1`,
    ['1']
  )
  await client.release()
}

export const getMoorlandRecord = async (connection, lfaMoorId) => {
  const client = await connection.connect()
  const result = await client.query(
    `SELECT * FROM moorland_designations WHERE lfa_moor_id = $1`,
    [lfaMoorId]
  )
  await client.release()
  return result?.rows?.[0] || null
}
