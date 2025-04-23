/**
 * @satisfies {ServerRegisterPluginObject<void>}
 */
const postgresTest = {
  plugin: {
    name: 'postgresTest',
    register: (server) => {
      server.route([
        {
          method: 'GET',
          path: '/postgres-test',
          handler: async (request, h) => {
            let client
            let id = 2

            try {
              client = await request.server.postgresDb.connect()

              const query = 'SELECT * FROM land_data WHERE parcel_id = $1'
              const values = [id]

              const result = await client.query(query, values)

              if (result.rowCount === 0) {
                return h
                  .response({
                    success: false,
                    message: `Item with id ${id} not found`
                  })
                  .code(404)
              }

              return h.response({
                success: true,
                data: result.rows[0]
              })
            } catch (error) {
              console.log({ error, id }, 'Error executing PostgreSQL query')
              return h
                .response({
                  success: false,
                  error: 'Database query failed',
                  message: error.message
                })
                .code(500)
            } finally {
              if (client) {
                client.release()
              }
            }
          }
        }
      ])
    }
  }
}

export { postgresTest }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
