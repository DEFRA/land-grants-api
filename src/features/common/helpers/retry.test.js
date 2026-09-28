import { withRetries } from '~/src/features/common/helpers/retry.js'

class FatalError extends Error {
  constructor(msg) {
    super(msg)
    this.isFatal = true
  }
}

class NonFatalError extends Error {
  constructor(msg) {
    super(msg)
    this.isFatal = false
  }
}

function shouldRetry(e) {
  return !e.isFatal
}

describe('withRetries', () => {
  it('should return a successful response immediately', async () => {
    const expected = 'ok'
    const f = vi.fn().mockResolvedValue(expected)

    const actual = await withRetries(f, shouldRetry, 3)

    expect(actual).toEqual(expected)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('should return a fatal error immediately', async () => {
    const expectedError = new FatalError('oh no')
    const f = vi.fn().mockRejectedValue(expectedError)

    const actual = withRetries(f, shouldRetry, 3)

    await expect(actual).rejects.toThrow(expectedError)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('should retry non-fatal errors until success', async () => {
    const expected = 'ok'
    const err = new NonFatalError('oh no')
    const f = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockReturnValueOnce(expected)

    const actual = await withRetries(f, shouldRetry, 3)

    expect(actual).toEqual(expected)
    expect(f).toHaveBeenCalledTimes(3)
  })

  it('should not retry if retryCount is 0', async () => {
    const expectedError = new NonFatalError('oh no')
    const f = vi.fn().mockRejectedValue(expectedError)

    const actual = withRetries(f, shouldRetry, 0)

    await expect(actual).rejects.toThrow(expectedError)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('should retry up to retryCount on non-fatal errors then rethrow the error', async () => {
    const expectedError = new NonFatalError('oh no')
    const f = vi.fn().mockRejectedValue(expectedError)

    const actual = withRetries(f, shouldRetry, 3)

    await expect(actual).rejects.toThrow(expectedError)
    expect(f).toHaveBeenCalledTimes(4)
  })
})
