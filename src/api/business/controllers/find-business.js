import { queryGraphQL } from '../../common/helpers/graphql.js';

const GRAPHQL_ENDPOINT = 'https://countries.trevorblades.com/'; 


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
    const query = `
          query {
            countries {
              name
              code
              phone
              states {
                code
              }
              capital
            }
          }
      `;

      try {
        const result = await queryGraphQL(GRAPHQL_ENDPOINT, query, {
            authorId: request.params.authorId
        });
        return result.data;
    } catch (error) {
        console.error('GraphQL query failed:', error);
        return h.response({ error: 'Failed to fetch data' }).code(500);
    }
  }
}

export { findBusinessController };

/**
 * @import { Request, ResponseToolkit, ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/api/common/helpers/mongodb.js'
 */
