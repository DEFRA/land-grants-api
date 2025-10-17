import { LogCodes } from './log-codes.js'

/**
 * Format context object into readable string
 * @param {object} context
 * @returns {string}
 */
const formatContext = (context) => {
  if (!context || Object.keys(context).length === 0) {
    return ''
  }

  const parts = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join(' | ')

  return ` [${parts}]`
}

/**
 * Log an informational event
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.category - Event category (e.g., 'application', 'payment', 'user')
 * @param {string} options.message - Message
 * @param {object} [options.context]
 */
export const logInfo = (logger, { category, message, context }) => {
  const logData = {
    event: {
      category,
      action: message,
      type: 'info'
    }
  }

  logger.info(logData, `${message}${formatContext(context)}`)
}

/**
 * Log a database query error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation failed
 * @param {Error} options.error - The error object
 * @param {object} [options.context] - Additional context (sheetId, parcelId, etc.)
 */
export const logDatabaseError = (
  logger,
  { operation, error, context = {} }
) => {
  const logData = {
    error: {
      message: error.message,
      stack_trace: error.stack,
      type: error.constructor.name
    },
    event: {
      category: 'database',
      action: operation,
      type: 'error'
    }
  }

  logger.error(
    logData,
    LogCodes.DATABASE.OPERATION_FAILED(`${operation}${formatContext(context)}`)
  )
}

/**
 * Log a validation error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What was being validated
 * @param {string|Array} options.errors - Validation error(s)
 * @param {object} [options.context]
 */
export const logValidationWarn = (
  logger,
  { operation, errors, context = {} }
) => {
  const errorText = Array.isArray(errors) ? errors.join(', ') : String(errors)

  const logData = {
    event: {
      category: 'validation',
      action: operation,
      type: 'warn',
      reason: errorText
    }
  }

  logger.warn(
    logData,
    LogCodes.VALIDATION.FAILED(`${operation}${formatContext(context)}`)
  )
}

/**
 * Log a resource not found
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.resourceType - Type of resource
 * @param {object} options.context - The context (sheetId, parcelId, id, etc.)
 */
export const logResourceNotFound = (logger, { resourceType, context }) => {
  logger.warn(
    {
      event: {
        category: 'resource',
        action: 'lookup',
        type: 'error'
      }
    },
    LogCodes.RESOURCE.NOT_FOUND(resourceType) + `${formatContext(context)}`
  )
}

/**
 * Log a business logic error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation failed
 * @param {Error} options.error - The error object
 * @param {object} [options.context]
 */
export const logBusinessError = (
  logger,
  { operation, error, context = {} }
) => {
  const logData = {
    error: {
      message: error.message,
      stack_trace: error.stack,
      type: error.constructor.name
    },
    event: {
      category: 'business_logic',
      action: operation,
      type: 'error'
    }
  }

  logger.error(
    logData,
    LogCodes.BUSINESS.OPERATION_FAILED(`${operation}${formatContext(context)}`)
  )
}

/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */
