import { config } from '~/src/config/index.js'
import * as proxy from '~/src/features/common/helpers/proxy.js'
import { getExistingDalAgreement } from './index.js'

vi.mock('~/src/features/common/helpers/proxy.js')

describe('getExistingDalAgreement', () => {
  const sbi = '123456789'

  afterEach(() => {
    config.set('dal.mockEnabled', config.default('dal.mockEnabled'))
    config.set('dal.stubApiEndpoint', config.default('dal.stubApiEndpoint'))
    config.set('dal.apiEndpoint', config.default('dal.apiEndpoint'))
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the stub DAL endpoint when mockEnabled is true', async () => {
    config.set('dal.mockEnabled', true)
    config.set('dal.stubApiEndpoint', 'http://stub-dal')

    const agreements = [{ code: 'LIG2', area: 1.23 }]
    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ agreements })
    })

    const result = await getExistingDalAgreement(sbi)

    expect(proxy.proxyFetch).toHaveBeenCalledWith(
      `http://stub-dal/agreements/${sbi}`,
      expect.objectContaining({ method: 'GET' })
    )
    expect(result).toEqual(agreements)
  })

  it('calls the real DAL endpoint when mockEnabled is false', async () => {
    config.set('dal.mockEnabled', false)
    config.set('dal.apiEndpoint', 'http://real-dal')

    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ agreements: [] })
    })

    await getExistingDalAgreement(sbi)

    expect(proxy.proxyFetch).toHaveBeenCalledWith(
      `http://real-dal/agreements/${sbi}`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns an empty array when no endpoint is configured', async () => {
    config.set('dal.mockEnabled', false)
    config.set('dal.apiEndpoint', '')

    const result = await getExistingDalAgreement(sbi)

    expect(result).toEqual([])
    expect(proxy.proxyFetch).not.toHaveBeenCalled()
  })

  it('throws when the DAL response is not ok', async () => {
    config.set('dal.mockEnabled', true)
    config.set('dal.stubApiEndpoint', 'http://stub-dal')

    proxy.proxyFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(getExistingDalAgreement(sbi)).rejects.toThrow(
      /Failed to fetch existing DAL agreements/
    )
  })

  it('defaults to an empty array when the DAL response has no agreements', async () => {
    config.set('dal.mockEnabled', true)
    config.set('dal.stubApiEndpoint', 'http://stub-dal')

    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })

    const result = await getExistingDalAgreement(sbi)

    expect(result).toEqual([])
  })
})
