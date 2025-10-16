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
      outcome: 'failure'
    }
  }

  if (reference) {
    logData.event.reference = reference
  }

  logger.error(logData, `Database operation failed: ${operation}`)
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

  logger.warn(logData, `Validation failed: ${operation}`)
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
    `${resourceType} not found`
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

  logger.error(logData, `Business operation failed: ${operation}`)
}

/**
 * Log an external API error
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.apiName - Name of the API
 * @param {Error} options.error - The error object
 */
export const logExternalApiError = (logger, { apiName, error }) => {
  logger.error(
    {
      error: {
        message: error.message,
        stack_trace: error.stack,
        type: error.constructor.name
      },
      event: {
        category: 'external_api',
        action: 'call',
        outcome: 'failure',
        reference: apiName
      }
    },
    `External API call failed: ${apiName}`
  )
}

/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */
