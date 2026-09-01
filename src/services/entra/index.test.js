import getToken from '~/src/services/entra/index.js'
import getStsToken from '~/src/services/aws/sts.js'
import { config } from '~/src/config/index.js'

const expectedUrl = 'https://www.example.com/dummy-tenant-id/oauth2/v2.0/token'
const expectedParams = {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_assertion: 'dummy-sts-token',
    client_assertion_type:
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_id: 'dummy-client-id',
    grant_type: 'client_credentials',
    scope: `dummy-client-id/.default`
  })
}

vi.mock('~/src/services/aws/sts.js')

describe('getToken', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    config.set('azure.entra', {
      host: 'https://www.example.com',
      clientId: 'dummy-client-id',
      tenantId: 'dummy-tenant-id'
    })

    getStsToken.mockResolvedValue('dummy-sts-token')
  })

  afterEach(() => {
    vi.clearAllMocks()
    config.set('azure.entra.host', config.default('azure.entra.host'))
    config.set('azure.entra.clientId', config.default('azure.entra.clientId'))
    config.set('azure.entra.tenantId', config.default('azure.entra.tenantId'))
  })

  test('should retrieve a token from Azure Entra', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          access_token: 'dummy-entra-token',
          expires_in: 3600,
          ext_expires_in: 3600,
          token_type: 'Bearer'
        })
    })

    const actual = await getToken()
    const expected = 'dummy-entra-token'

    expect(actual).toEqual(expected)
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedParams)
  })

  test('should throw an error if request fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 400,
      text: () => Promise.resolve('Bad request')
    })

    await expect(getToken('dummy-sts-token')).rejects.toThrow()
    expect(fetch).toHaveBeenCalledWith(expectedUrl, expectedParams)
  })
})
