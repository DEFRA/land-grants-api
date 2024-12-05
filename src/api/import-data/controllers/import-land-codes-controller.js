import { insertLandCodesData } from '~/src/api/import-data/helpers/insert-land-codes-data.js'
import { deleteLandCodesData } from '~/src/api/import-data/helpers/delete-land-codes-data.js'

const buildDocument = (csvData) => {
  const result = []
  const rows = csvData.split(/\r\n|\r|\n/).slice(1)
  const data = rows.map((row) => {
    const columns = row.split(',')
    return {
      landCoverType: columns[0],
      landCoverTypeCode: columns[1],
      landCoverClass: columns[2],
      landCoverClassCode: columns[3],
      landCover: columns[4],
      landCoverCode: columns[5],
      landUse: columns[6],
      landUseCode: columns[7]
    }
  })

  data.forEach((row) => {
    if (!result.find((element) => element.code === row.landCoverTypeCode)) {
      result.push({
        name: row.landCoverType,
        code: row.landCoverTypeCode,
        classes: findClasses(data, row.landCoverTypeCode)
      })
    }
  })

  return result
}

const findClasses = (data, parentCode) => {
  const result = []

  data.forEach((row) => {
    if (
      !result.find((element) => element.code === row.landCoverClassCode) &&
      row.landCoverTypeCode === parentCode
    ) {
      result.push({
        name: row.landCoverClass,
        code: row.landCoverClassCode,
        covers: findCovers(data, row.landCoverClassCode)
      })
    }
  })

  return result
}

const findCovers = (data, parentCode) => {
  const result = []

  data.forEach((row) => {
    if (
      !result.find((element) => element.code === row.landCoverCode) &&
      row.landCoverClassCode === parentCode
    ) {
      result.push({
        name: row.landCover,
        code: row.landCoverCode,
        uses: findUses(data, row.landCoverCode)
      })
    }
  })

  return result
}

const findUses = (data, parentCode) => {
  const result = []

  data.forEach((row) => {
    if (
      !result.find((element) => element.code === row.landUseCode) &&
      row.landCoverCode === parentCode
    ) {
      result.push({
        name: row.landUse,
        code: row.landUseCode
      })
    }
  })

  return result
}

/**
 * Import Land Codes controller
 * Takes a compatibiliy matrix spreadsheet and inserts it into MongoDB
 * @satisfies {Partial<ServerRoute>}
 */
const importLandCodesController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    if (!request.payload) h.response({ message: 'error' }).code(500)

    if (typeof request.payload === 'string') {
      const data = request.payload

      const docs = buildDocument(data)

      await deleteLandCodesData(request.db)
      const result = await insertLandCodesData(request.db, docs)

      return h
        .response({
          message: 'success',
          result: `Inserted ${result.insertedCount} rows`
        })
        .code(200)
    }
  }
}

export { importLandCodesController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
