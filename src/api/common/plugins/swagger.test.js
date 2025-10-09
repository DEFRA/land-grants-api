import { swagger } from '~/src/api/common/plugins/swagger.js'
import packageJson from '~/package.json' with { type: 'json' }

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
          info: {
            title: 'Land Grants API',
            version: packageJson.version
          },
          swaggerUI: true,
          documentationPage: true
        }
      }
    ])
  })
})
