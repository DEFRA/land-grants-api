import { swagger } from '~/src/api/common/plugins/swagger.js'
import { config } from '~/src/config/index.js'

const mockRegister = jest.fn()
const mockServer = {
  register: mockRegister
}

jest.mock('@hapi/inert', () => 'mock-inert')
jest.mock('@hapi/vision', () => 'mock-vision')
jest.mock('hapi-swagger', () => 'mock-hapi-swagger')

describe('#swagger', () => {
  beforeEach(() => {
    mockRegister.mockClear()
    config.serviceVersion = '1.0.0'
  })

  test('Should have the correct plugin name', () => {
    expect(swagger.plugins.name).toBe('swagger-documentation')
  })

  test('Should register all required plugins', async () => {
    await swagger.plugins.register(mockServer)

    expect(mockRegister).toHaveBeenCalledTimes(1)
    expect(mockRegister).toHaveBeenCalledWith([
      'mock-inert',
      'mock-vision',
      {
        plugin: 'mock-hapi-swagger',
        options: {
          definitionPrefix: 'useLabel',
          security: [{ jwt: [] }],
          securityDefinitions: {
            jwt: {
              type: 'apiKey',
              name: 'Authorization',
              in: 'header',
              description: 'Enter your JWT token without any prefix'
            }
          },
          info: {
            title: 'Land Grants API',
            version: config.serviceVersion
          },
          swaggerUI: true,
          documentationPage: true
        }
      }
    ])
  })
})
