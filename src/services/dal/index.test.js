import * as proxy from '~/src/features/common/helpers/proxy.js'
import { GET_BUSINESS } from './queries.js'
import {
  PARCEL_ID,
  SHEET_ID,
  SIMPLE_BUSINESS
} from '~/src/services/dal/fixtures/business.js'
import { config } from '~/src/config/index.js'
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { getAgreements } from './index.js'

vi.mock('~/src/features/common/helpers/proxy.js')

const stubEndpoint = 'http://stub-dal/graphql'
const dalResponse = { data: { business: SIMPLE_BUSINESS } }
const response404 = {
  errors: [
    {
      message: 'Rural payments organisation not found',
      locations: [{ line: 1, column: 32 }],
      path: ['business'],
      extensions: { code: 'NOT FOUND' }
    }
  ]
}

const mockLogger = { info: vi.fn() }

describe('getAgreements', () => {
  const sbi = '123456789'

  afterEach(() => {
    config.set('dal.apiEndpoint', config.default('dal.apiEndpoint'))
    config.set('featureFlags.useDal', config.default('featureFlags.useDal'))
  })

  beforeEach(() => {
    config.set('dal.apiEndpoint', stubEndpoint)
    config.set('featureFlags.useDal', true)
    vi.clearAllMocks()
  })

  it('should provide agreements from DAL', async () => {
    proxy.proxyFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dalResponse)
    })

    const result = await getAgreements(
      sbi,
      PARCEL_ID,
      SHEET_ID,
      'dummy',
      mockLogger
    )

    expect(proxy.proxyFetch).toHaveBeenCalledWith(
      stubEndpoint,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Gateway-Type': 'external',
          'X-Forwarded-Authorization': 'dummy'
        }),
        body: JSON.stringify({ query: GET_BUSINESS, variables: { sbi } })
      })
    )
    expect(result).toEqual(
      dalBusinessToAgreements(dalResponse.data.business, PARCEL_ID, SHEET_ID)
    )
  })

  it('throws when the DAL response is not ok', async () => {
    proxy.proxyFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      getAgreements(sbi, PARCEL_ID, SHEET_ID, 'dummy', mockLogger)
    ).rejects.toThrow()
  })

  it('returns an empty array when DAL 404s', async () => {
    proxy.proxyFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve(response404)
    })
    const result = await getAgreements(
      sbi,
      PARCEL_ID,
      SHEET_ID,
      'dummy',
      mockLogger
    )

    expect(result).toEqual([])
  })

  it('returns an empty array when feature flag is off', async () => {
    config.set('featureFlags.useDal', false)
    const result = await getAgreements(
      sbi,
      PARCEL_ID,
      SHEET_ID,
      'dummy',
      mockLogger
    )

    expect(proxy.proxyFetch).not.toBeCalled()
    expect(result).toEqual([])
  })

  // TODO: replace with service-to-service auth in this scenario
  it('returns an empty array when missing a defra ID token', async () => {
    const result = await getAgreements(
      sbi,
      PARCEL_ID,
      SHEET_ID,
      null,
      mockLogger
    )

    expect(proxy.proxyFetch).not.toBeCalled()
    expect(result).toEqual([])
  })
})
