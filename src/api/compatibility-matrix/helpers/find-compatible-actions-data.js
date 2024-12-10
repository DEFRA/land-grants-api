/**
 * Database helper. Returns all objects stored in the example-data collection in mongodb.
 * See src/server/helpers/mongodb.js for an example of how the indexes are created for this collection.
 * @param { import('mongodb').Db } db
 * @param { string } action
 * @returns {Promise<*[]>}
 */
async function findAllCompatibleActions(db, action) {
  const cursor = db
    .collection('options-data')
    .find({ option_code: action.toUpperCase() }, { projection: { _id: 0 } })

  return await cursor.toArray()
}

export { findAllCompatibleActions }
