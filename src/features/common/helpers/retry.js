/**
 * Execute the provided function and retry up to retryCount times on error
 *
 * shouldRetry takes the error caught and specifies whether it's recoverable -- for example for
 * an HTTP request this should return false if it intercepts an error representing a 4xx status
 * code, since we can't retry those, but true if it intercepts a 5xx.
 *
 * If the final retry fails, the error will be thrown to the caller.
 * @param {() => Promise<any>} f - Async function to execute
 * @param {(error) => boolean} shouldRetry - Whether the error is recoverable and should be retried
 * @param {number} retryCount - Maximum number of retries, must be >= 0
 */
export async function withRetries(f, shouldRetry, retryCount) {
  for (let i = 0; i <= retryCount; i++) {
    try {
      const res = await f()
      return res
    } catch (err) {
      if (!shouldRetry(err) || i === retryCount) {
        throw err
      }
    }
  }
}
