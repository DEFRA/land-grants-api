import { statusCodes } from '~/src/features/common/constants/status-codes.js'

/**
 * Encapsulate an error talking to the DAL. statusCode is the code we should respond with on the
 * API and is usually a 500.
 */
class DALError extends Error {
  /**
   * @param {string} sbi
   * @param {string} details
   * @param {number} statusCode
   */
  constructor(sbi, details, statusCode) {
    super(`Failed to fetch existing DAL agreements for SBI ${sbi}: ${details}`)
    this.statusCode = statusCode
  }
}

/**
 * A generic HTTP error from the DAL like a 5xx which we don't have specific handling for
 */
export class HTTPError extends DALError {
  /**
   * @param {string} sbi
   * @param {number} status
   * @param {string} statusText
   */
  constructor(sbi, status, statusText) {
    super(sbi, `${status}: ${statusText}`, statusCodes.internalServerError)
  }
}

/**
 * DAL will generally respond with a 200 and errors since it's a graphQL endpoint
 */
export class GraphQLError extends DALError {
  /**
   * @param {string} sbi
   * @param {object[]} errors
   */
  constructor(sbi, errors) {
    super(
      sbi,
      errors.map((e) => e.message ?? 'Unknown error').join(', '),
      statusCodes.internalServerError
    )
  }
}

/**
 * If the DAL returns a 401 we should pass the 401 back to the caller as it's probably an issue
 * with the caller's credentials
 */
export class UnauthorizedError extends DALError {
  /**
   * @param {string} sbi
   */
  constructor(sbi) {
    super(
      sbi,
      'Defra ID token may be invalid or expired',
      statusCodes.unauthorized
    )
  }
}
