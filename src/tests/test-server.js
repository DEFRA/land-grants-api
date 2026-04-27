import Hapi from '@hapi/hapi'
import { failAction } from '~/src/features/common/helpers/fail-action.js'

const createTestServer = (customFailAction = failAction) => {
  const server = Hapi.server({
    port: 3001,
    host: 'localhost',
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction: customFailAction
      }
    }
  })
  return server
}

export default createTestServer
