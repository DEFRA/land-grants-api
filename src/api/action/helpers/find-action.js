/**
 * @param { import('mongodb').Db } db
 * @param { string } actionCode
 * @returns {Promise<*>}
 */
async function findAction(db, actionCode) {
  return await db.collection('actions').findOne(
    {
      code: actionCode
    },
    { projection: { _id: 0 } }
  )
}

export { findAction }
