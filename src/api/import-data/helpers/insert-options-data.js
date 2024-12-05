/**
 * Database helper. Returns all objects stored in the example-data collection in mongodb.
 * See src/server/helpers/mongodb.js for an example of how the indexes are created for this collection.
 * @param { import('mongodb').Db } db
 * @returns {Promise<*>}
 */
async function insertOptionsData(db, docs) {
  const result = await db
    .collection('options-data')
    .insertMany(docs, { ordered: true })

  return result
}

export { insertOptionsData }
