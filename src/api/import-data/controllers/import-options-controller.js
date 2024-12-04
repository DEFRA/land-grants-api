import { insertOptionsData } from '~/src/api/import-data/helpers/insert-options-data.js'
import { deleteOptionsData } from '~/src/api/import-data/helpers/delete-options-data.js'

/**
 * Import Compatibility Matrix controller
 * Takes a compatibiliy matrix spreadsheet and inserts it into MongoDB
 * @satisfies {Partial<ServerRoute>}
 */
const importOptionsController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    if (!request.payload) h.response({ message: 'error' }).code(500)

    if (typeof request.payload === 'string') {
      const docs = request.payload
        .split(/\r\n|\r|\n/)
        .slice(1)
        .map((row) => {
          const columns = row.split(',')
          return {
            option_code: columns[0],
            option_code_compatibility: columns[1],
            type: columns[2],
            description: columns[3],
            year: columns[4]
          }
        })

      await deleteOptionsData(request.db)
      const result = await insertOptionsData(request.db, docs)

      return h
        .response({
          message: 'success',
          result: `Inserted ${result.insertedCount} rows`
        })
        .code(200)
    }
  }
}

export { importOptionsController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
