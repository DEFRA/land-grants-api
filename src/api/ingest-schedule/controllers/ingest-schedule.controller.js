import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { logInfo } from '~/src/api/common/helpers/logging/log-helpers.js'
import { getFiles } from '../../common/s3/getFiles.js'
import { startWorker, category, operation } from '../worker/workers.js'
import { config } from '~/src/config/index.js'

const ingestLandDataController = {
  handler: async (request, h) => {
    const taskId = Date.now()

    logInfo(request.logger, {
      category,
      operation: `${operation}_start`,
      message: 'Starting land data ingest',
      context: { taskId }
    })

    const files = await getFiles(request.server.s3, config.get('s3.bucket'))

    if (files.length > 0) {
      logInfo(request.logger, {
        category,
        operation: `${operation}_new_files`,
        message: `Found ${files.length} new files in the land-data bucket`,
        context: { files }
      })

      startWorker(request, taskId, files)

      return h
        .response({ message: 'Land data ingest started', taskId })
        .code(statusCodes.ok)
    } else {
      logInfo(request.logger, {
        category,
        operation: `${operation}_no_new_files`,
        message: 'No new files found in the land-data bucket',
        context: { files }
      })

      return h
        .response({
          message: 'No new files found in the land-data bucket',
          taskId
        })
        .code(statusCodes.ok)
    }
  }
}

export { ingestLandDataController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
