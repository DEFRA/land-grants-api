import { GetWebIdentityTokenCommand, STSClient } from '@aws-sdk/client-sts'

import getToken from '~/src/services/aws/sts.js'

vi.mock('@aws-sdk/client-sts')

describe('getToken', () => {
  beforeEach(() => {
    // Resolve the mock class here with a copy of its arguments, for ease of asserting on the cmd
    GetWebIdentityTokenCommand.mockImplementation(
      class {
        constructor(data) {
          return data
        }
      }
    )
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('should call STS to get a token', async () => {
    const mockSend = vi
      .fn()
      .mockReturnValue({ WebIdentityToken: 'dummy-token' })
    STSClient.mockImplementation(
      vi.fn(
        class {
          send = mockSend
        }
      )
    )

    const result = await getToken()
    expect(result).toEqual('dummy-token')

    expect(mockSend).toHaveBeenCalledWith({
      SigningAlgorithm: 'RS256',
      Audience: ['land_grants_api'],
      DurationSeconds: 3600
    })
  })

  test('should propagate any errors', async () => {
    const mockSend = vi.fn().mockImplementation(() => {
      throw new Error('argh')
    })
    STSClient.mockImplementation(
      vi.fn(
        class {
          send = mockSend
        }
      )
    )

    const result = getToken()
    await expect(result).rejects.toThrow()

    expect(mockSend).toHaveBeenCalledWith({
      SigningAlgorithm: 'RS256',
      Audience: ['land_grants_api'],
      DurationSeconds: 3600
    })
  })

  test('should throw an error if returned token is undefined', async () => {
    const mockSend = vi.fn().mockReturnValue({ WebIdentityToken: undefined })

    STSClient.mockImplementation(
      vi.fn(
        class {
          send = mockSend
        }
      )
    )

    const result = getToken()
    await expect(result).rejects.toThrow()

    expect(mockSend).toHaveBeenCalledWith({
      SigningAlgorithm: 'RS256',
      Audience: ['land_grants_api'],
      DurationSeconds: 3600
    })
  })
})
