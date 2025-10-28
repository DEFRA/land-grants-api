import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import {
  fileProcessor,
  createTaskInfo
} from '../service/ingest-schedule.service.js'
import { internalServerErrorResponseSchema } from '~/src/api/common/schema/index.js'
import { ingestScheduleSuccessResponseSchema } from '../schema/ingest-schedule.schema.js'

export const IngestScheduleController = {
  options: {
    tags: ['api'],
    description: 'Ingest land data schedule',
    notes: 'Ingest land data schedule',
    response: {
      status: {
        200: ingestScheduleSuccessResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  /**
   * Handler function for ingesting land data
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    const category = 'land_data_ingest'
    const { title, taskId, bucket } = createTaskInfo(Date.now(), category)

    try {
      logInfo(request.logger, {
        category,
        operation: `${category}_start`,
        message: `Starting ${title}`,
        context: { taskId }
      })

      const result = await fileProcessor(
        request,
        category,
        title,
        taskId,
        bucket
      )

      if (result) {
        logInfo(request.logger, {
          category,
          operation: `${category}_new_files`,
          message: `New files found in ${bucket} bucket`,
          context: { bucket, taskId }
        })

        return h
          .response({ message: `${title} started`, taskId })
          .code(statusCodes.ok)
      } else {
        logInfo(request.logger, {
          category,
          operation: `${category}_no_new_files`,
          message: `No new files found in ${bucket} bucket`,
          context: { bucket, taskId }
        })

        return h
          .response({
            message: `No new files found in ${bucket} bucket`,
            taskId
          })
          .code(statusCodes.ok)
      }
    } catch (error) {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error,
        context: {
          taskId
        }
      })
      return Boom.internal('Error ingesting land data')
    }
  }
}
