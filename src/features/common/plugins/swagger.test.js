import { swagger } from '~/src/features/common/plugins/swagger.js'
import packageJson from '~/package.json' with { type: 'json' }
import { vi } from 'vitest'

const mockRegister = vi.fn()
const mockServer = {
  register: mockRegister
}

vi.mock('@hapi/inert', () => ({
  default: 'mock-inert'
}))
vi.mock('@hapi/vision', () => ({
  default: 'mock-vision'
}))
vi.mock('hapi-swagger', () => ({
  default: 'mock-hapi-swagger'
}))

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
