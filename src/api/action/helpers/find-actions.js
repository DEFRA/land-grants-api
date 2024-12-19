/**
 * @param { import('mongodb').Db } db
 * @param { Array<string> } actionCodes
 * @returns {Promise<Action[]>}
 */
async function findActions(db, actionCodes) {
  return await db
    .collection('actions')
    .find(
      {
        $or: actionCodes.map((code) => ({
          code
        }))
      },
      { projection: { _id: 0 } }
    )
    .toArray()
}

export { findActions }
