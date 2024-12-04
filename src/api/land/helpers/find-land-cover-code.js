const deepSearch = (data, value) => {
  if (data.code === value) return data

  for (const key of ['classes', 'covers', 'uses']) {
    if (data[key]) {
      for (const item of data[key]) {
        const result = deepSearch(item, value)
        if (result) return result
      }
    }
  }

  return null
}

/**
 * Finds and returns land cover for a single land parcel from ArcGIS.
 * @param { import('mongodb').Db } db
 * @param { string } landCoverCode
 * @returns {Promise<{}|null>}
 */
async function findLandCoverCode(db, landCoverCode) {
  const result = db.collection('land-codes').find(
    {
      $or: [
        { code: landCoverCode.toString() },
        { 'classes.code': landCoverCode.toString() },
        { 'classes.covers.code': landCoverCode.toString() },
        { 'classes.covers.uses.code': landCoverCode.toString() }
      ]
    },
    { projection: { _id: 0 } }
  )

  const resultArray = await result.toArray()
  return deepSearch(resultArray[0], landCoverCode.toString())
}

export { findLandCoverCode }
