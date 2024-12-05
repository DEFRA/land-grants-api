/**
 * @param { import('mongodb').Db } db
 * @returns {Promise<*[]>}
 */
async function findAllActions(db) {
  const cursor = db.collection('actions').find({}, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { findAllActions }
