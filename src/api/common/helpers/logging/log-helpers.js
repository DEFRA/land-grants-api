import { LogCodes } from './log-codes.js'

/**
 * Log an informational event
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation occurred
 * @param {string} options.category - Event category (e.g., 'application', 'payment', 'user')
 * @param {string} [options.reference] - Optional reference context
 * @param {string} [options.message] - Optional custom message (defaults to operation)
 */
export const logInfo = (
  logger,
  { operation, category, reference, message }
) => {
  const logData = {
    event: {
      category,
      action: operation,
      outcome: 'success'
    }
  }

  if (reference) {
    logData.event.reference = reference
  }

  logger.info(logData, message ?? operation)
}

/**
 * Log a database query error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation failed
 * @param {Error} options.error - The error object
 * @param {string} [options.reference] - Optional reference context
 */
export const logDatabaseError = (logger, { operation, error, reference }) => {
  const logData = {
    error: {
      message: error.message,
      stack_trace: error.stack,
      type: error.constructor.name
    },
    event: {
      category: 'database',
      action: operation,
      type: 'failure'
    }
  }

  if (reference) {
    logData.event.reference = reference
  }

  logger.error(logData, LogCodes.DATABASE.OPERATION_FAILED(operation))
}

/**
 * Log a validation error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What was being validated
 * @param {string|Array} options.errors - Validation error(s)
 * @param {string} [options.reference] - Optional reference context
 */
export const logValidationWarn = (logger, { operation, errors, reference }) => {
  const logData = {
    event: {
      category: 'validation',
      action: operation,
      outcome: 'failure',
      reason: Array.isArray(errors) ? errors.join(', ') : String(errors)
    }
  }

  if (reference) {
    logData.event.reference = reference
  }

  logger.warn(logData, LogCodes.VALIDATION.FAILED(operation))
}

/**
 * Log a resource not found
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.resourceType - Type of resource
 * @param {string} options.reference - Resource identifier(s)
 */
export const logResourceNotFound = (logger, { resourceType, reference }) => {
  logger.warn(
    {
      event: {
        category: 'resource',
        action: 'lookup',
        outcome: 'failure',
        reference
      }
    },
    LogCodes.RESOURCE.NOT_FOUND(resourceType)
  )
}

/**
 * Log a business logic error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation failed
 * @param {Error} options.error - The error object
 * @param {string} [options.reference] - Optional reference context
 */
export const logBusinessError = (logger, { operation, error, reference }) => {
  const logData = {
    error: {
      message: error.message,
      stack_trace: error.stack,
      type: error.constructor.name
    },
    event: {
      category: 'business_logic',
      action: operation,
      outcome: 'failure'
    }
  }

  if (reference) {
    logData.event.reference = reference
  }

  logger.error(logData, LogCodes.BUSINESS.OPERATION_FAILED(operation))
}

/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */
