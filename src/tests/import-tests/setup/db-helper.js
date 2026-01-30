export const getRecordsByQuery = async (connection, query, values) => {
  const client = await connection.connect()
  const result = await client.query(query, values)
  await client.release()
  return result?.rows || []
}
