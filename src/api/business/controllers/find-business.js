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
    const sbi = request.params.sbi;
      try {
        const result = await findBusinessDetails(sbi);
        return result.data;
    } catch (error) {
        console.error('Consolidated View query failed:', error);
        return h.response({ error: 'Failed to fetch data' }).code(500);
    }
  }
}

export { findBusinessController };

/**
 * @import { Request, ResponseToolkit, ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/api/common/helpers/mongodb.js'
 */
