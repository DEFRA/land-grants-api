import getToken from '~/src/services/entra/index.js'
import { GET_BUSINESS } from './queries.js'
import {
  GraphQLError,
  HTTPError,
  UnauthorizedError
} from '~/src/services/dal/errors.js'
import { SIMPLE_BUSINESS } from '~/src/services/dal/fixtures/business.js'
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
const errorResponse = {
  errors: [
    {
      message: "variable 'sbi' must match pattern ^[1-9][0-9]{8}$",
      locations: [{ line: 2, column: 3 }],
      path: ['business'],
      extensions: { code: 'BAD_USER_INPUT' }
    }
  ]
}

const mockLogger = { info: vi.fn() }
vi.mock('~/src/services/entra/index.js')

describe('getAgreements', () => {
  const sbi = '123456789'

  afterEach(() => {
    ;[
      'dal.apiEndpoint',
      'dal.serviceAccount',
      'dal.useEntraAuth',
      'featureFlags.useDal'
    ].forEach((v) => {
      config.set(v, config.default(v))
    })
  })

  beforeEach(() => {
    config.set('dal.apiEndpoint', stubEndpoint)
    config.set('dal.serviceAccount', 'land-grants-api@defra.gov.uk')
    config.set('dal.useEntraAuth', true)
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

    const result = await getAgreements(sbi, 'dummy', mockLogger)

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
    expect(result).toEqual(dalBusinessToAgreements(dalResponse.data.business))

    expect(getToken).toHaveBeenCalled()
  })

  it('throws when the DAL HTTP response is not ok', async () => {
    const status = 500
    const statusText = 'Internal Server Error'

    const expectedError = new HTTPError(sbi, status, statusText)

    fetch.mockResolvedValue({ ok: false, status, statusText })

    await expect(getAgreements(sbi, 'dummy', mockLogger)).rejects.toThrow(
      expectedError
    )
  })

  it('throws when the DAL response is 200 but contains errors', async () => {
    const expectedError = new GraphQLError(sbi, errorResponse.errors)

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(errorResponse)
    })

    await expect(getAgreements(sbi, 'dummy', mockLogger)).rejects.toThrow(
      expectedError
    )
  })

  it('throws an UnauthorizedError when DAL response is 401', async () => {
    const expectedError = new UnauthorizedError(sbi)

    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: () => Promise.resolve({ error: 'Unauthorized' })
    })

    await expect(getAgreements(sbi, 'dummy', mockLogger)).rejects.toThrow(
      expectedError
    )
  })

  it('returns an empty object when DAL 404s', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve(response404)
    })
    const result = await getAgreements(sbi, 'dummy', mockLogger)

    expect(result).toEqual({})
  })

  it('returns an empty object when feature flag is off', async () => {
    config.set('featureFlags.useDal', false)
    const result = await getAgreements(sbi, 'dummy', mockLogger)

    expect(fetch).not.toBeCalled()
    expect(result).toEqual({})
  })

  it('uses the robot service account for auth when missing a defra ID token', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dalResponse)
    })

    const result = await getAgreements(sbi, null, mockLogger)

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
    expect(result).toEqual(dalBusinessToAgreements(dalResponse.data.business))
  })

  it('does not use entra auth if switched off', async () => {
    config.set('dal.useEntraAuth', false)

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(dalResponse)
    })

    await getAgreements(sbi, 'dummy', mockLogger)

    expect(fetch).toHaveBeenCalledWith(
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

    expect(getToken).not.toHaveBeenCalled()
  })
})
