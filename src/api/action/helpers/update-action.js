/**
 * @param { import('mongodb').Db } db
 * @param { string } actionCode
 * @param { import('mongodb').Document } doc
 * @returns {Promise<{}|null>}
 */
async function updateAction(db, actionCode, doc) {
  return await db.collection('actions').replaceOne(
    {
      code: actionCode
    },
    doc
  )
}

export { updateAction }
