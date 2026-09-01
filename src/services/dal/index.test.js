import getToken from '~/src/services/entra/index.js'
import { GET_BUSINESS } from './queries.js'
import {
  PARCEL_ID,
  SHEET_ID,
  SIMPLE_BUSINESS
} from '~/src/services/dal/fixtures/business.js'
import { config } from '~/src/config/index.js'
import { dalBusinessToAgreements } from '~/src/features/agreements/transformers/agreements.transformer.js'
import { getAgreements } from './index.js'

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
vi.mock('~/src/services/entra/index.js')

describe('getAgreements', () => {
  const sbi = '123456789'

  afterEach(() => {
    ;['dal.apiEndpoint', 'dal.serviceAccount', 'featureFlags.useDal'].forEach(
      (v) => {
        config.set(v, config.default(v))
      }
    )
  })

  beforeEach(() => {
    config.set('dal.apiEndpoint', stubEndpoint)
    config.set('dal.serviceAccount', 'land-grants-api@defra.gov.uk')
    config.set('featureFlags.useDal', true)

    vi.clearAllMocks()
    global.fetch = vi.fn()
    getToken.mockResolvedValue('dummy-entra-token')
  })

  it('should provide agreements from DAL', async () => {
    fetch.mockResolvedValue({
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

    expect(fetch).toHaveBeenCalledWith(
      stubEndpoint,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer dummy-entra-token',
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
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      getAgreements(sbi, PARCEL_ID, SHEET_ID, 'dummy', mockLogger)
    ).rejects.toThrow()
  })

  it('returns an empty array when DAL 404s', async () => {
    fetch.mockResolvedValue({
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

    expect(fetch).not.toBeCalled()
    expect(result).toEqual([])
  })

  it('uses the robot service account for auth when missing a defra ID token', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dalResponse)
    })

    const result = await getAgreements(
      sbi,
      PARCEL_ID,
      SHEET_ID,
      null,
      mockLogger
    )

    expect(fetch).toHaveBeenCalledWith(
      stubEndpoint,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer dummy-entra-token',
          'Content-Type': 'application/json',
          'Gateway-Type': 'internal',
          Email: 'land-grants-api@defra.gov.uk'
        }),
        body: JSON.stringify({ query: GET_BUSINESS, variables: { sbi } })
      })
    )
    expect(result).toEqual(
      dalBusinessToAgreements(dalResponse.data.business, PARCEL_ID, SHEET_ID)
    )
  })
})
