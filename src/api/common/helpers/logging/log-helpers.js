// ~/src/api/common/helpers/logging/log-helpers.js

/**
 * Log an informational event
 * @param {Logger} logger
 * @param {object} options
 * @param {string} options.operation - What operation occurred
 * @param {string} options.category - Event category
 * @param {string} [options.reference] - Optional reference context
 */
export const logInfo = (logger, { operation, category, reference }) => {
  const context = {
    'event.category': category,
    'event.action': operation,
    'event.outcome': 'success'
  }

  if (reference) {
    context['event.reference'] = reference
  }

  logger.info(context, operation)
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
  const context = {
    'error.message': error.message,
    'error.stack_trace': error.stack,
    'error.type': error.constructor.name,
    'event.category': 'database',
    'event.action': operation,
    'event.outcome': 'failure'
  }

  if (reference) {
    context['event.reference'] = reference
  }

  logger.error(context, `Database operation failed: ${operation}`)
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
  const errorText = Array.isArray(errors) ? errors.join(', ') : String(errors)

  const context = {
    'event.category': 'validation',
    'event.action': operation,
    'event.outcome': 'failure',
    'event.reason': errorText
  }

  if (reference) {
    context['event.reference'] = reference
  }

  logger.warn(context, `Validation failed: ${operation}`)
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
      'event.category': 'resource',
      'event.action': 'lookup',
      'event.outcome': 'failure',
      'event.reference': reference
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
  const context = {
    'error.message': error.message,
    'error.stack_trace': error.stack,
    'error.type': error.constructor.name,
    'event.category': 'business_logic',
    'event.action': operation,
    'event.outcome': 'failure'
  }

  if (reference) {
    context['event.reference'] = reference
  }

  logger.error(context, `Business operation failed: ${operation}`)
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
      'error.message': error.message,
      'error.stack_trace': error.stack,
      'error.type': error.constructor.name,
      'event.category': 'external_api',
      'event.action': 'call',
      'event.outcome': 'failure',
      'event.reference': apiName
    },
    `External API call failed: ${apiName}`
  )
}

/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */
