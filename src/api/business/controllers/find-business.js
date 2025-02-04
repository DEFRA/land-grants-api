import { findBusinessDetails } from '../helpers/business.js';

/**
 * @satisfies {Partial<ServerRoute>}
 */
const findBusinessController = {
  /**
   * @param { Request & MongoDBPlugin } request
   * @param { ResponseToolkit } h
   * @returns { Promise<*> }
   */

  handler: async (request, h) => {
    const {sbi, crn} = request.params;
    try {
        const result = await findBusinessDetails(sbi, crn);
        return result.data;
    } catch (error) {
        return h.response({ error: error.message }).code(error.code);
    }
  }
}

export { findBusinessController };

/**
 * @import { Request, ResponseToolkit, ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/api/common/helpers/mongodb.js'
 */
