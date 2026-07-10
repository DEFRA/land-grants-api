import { config } from '~/src/config/index.js'
import * as proxy from '~/src/features/common/helpers/proxy.js'
import { getExistingDalAgreements } from './index.js'
import { getAgreementsBySbiQuery } from './queries.js'

vi.mock('~/src/features/common/helpers/proxy.js')

describe('getExistingDalAgreement', () => {
  const sbi = '123456789'

  afterEach(() => {
    config.set('dal.apiEndpoint', config.default('dal.apiEndpoint'))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the stub DAL endpoint when mockEnabled is true', async () => {
    config.set('dal.apiEndpoint', 'http://stub-dal/graphql')

    const agreements = {
      data: {
        business: {
          agreements: [
            {
              contractId: '222222222',
              name: 'ELS AGREEMENT'
            }
          ]
        }
      }
    }

    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(agreements)
    })

    const result = await getExistingDalAgreements(sbi, {
      defraIdToken: 'mock-token'
    })

    expect(proxy.proxyFetch).toHaveBeenCalledWith(
      `http://stub-dal/graphql`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'gateway-type': 'external',
          'x-forwarded-authorization': 'mock-token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          query: getAgreementsBySbiQuery,
          variables: { sbi }
        })
      })
    )
    expect(result).toEqual(agreements.data.business.agreements)
  })

  it('throws when the DAL response is not ok', async () => {
    config.set('dal.apiEndpoint', 'http://stub-dal/graphql')

    proxy.proxyFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      getExistingDalAgreements(sbi, { defraIdToken: 'mock-token' })
    ).rejects.toThrow(/Failed to fetch existing DAL agreements/)
  })

  it('defaults to an empty array when the DAL response has no agreements', async () => {
    config.set('dal.apiEndpoint', 'http://stub-dal/graphql')

    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })

    const result = await getExistingDalAgreements(sbi, {
      defraIdToken: 'mock-token'
    })

    expect(result).toEqual([])
  })
})
