import { jest } from '@jest/globals'
import {
  logInfo,
  logDatabaseError,
  logValidationWarn,
  logResourceNotFound,
  logBusinessError
} from './log-helpers.js'

describe('Log Helpers', () => {
  let mockLogger

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }
  })

  describe('logInfo', () => {
    it('should log info with all fields', () => {
      logInfo(mockLogger, {
        operation: 'calculate payment',
        category: 'payment',
        reference: 'app-123',
        message: 'Payment calculated successfully'
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'payment',
            action: 'calculate payment',
            outcome: 'success',
            reference: 'app-123'
          }
        },
        'Payment calculated successfully'
      )
    })

    it('should use operation as message when message is not provided', () => {
      logInfo(mockLogger, {
        operation: 'validate application',
        category: 'application'
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'application',
            action: 'validate application',
            outcome: 'success'
          }
        },
        'validate application'
      )
    })

    it('should not include reference if not provided', () => {
      logInfo(mockLogger, {
        operation: 'fetch parcels',
        category: 'parcel'
      })

      const callArgs = mockLogger.info.mock.calls[0][0]
      expect(callArgs.event.reference).toBeUndefined()
    })
  })

  describe('logDatabaseError', () => {
    it('should log database error with all fields', () => {
      const error = new Error('Connection timeout')
      error.code = 'ETIMEDOUT'

      logDatabaseError(mockLogger, {
        operation: 'getEnabledActions',
        error,
        reference: 'sheet:123,parcel:456'
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Connection timeout',
            stack_trace: error.stack,
            type: 'Error'
          },
          event: {
            category: 'database',
            action: 'getEnabledActions',
            outcome: 'failure',
            reference: 'sheet:123,parcel:456'
          }
        },
        'Database operation failed: getEnabledActions'
      )
    })

    it('should log database error without reference', () => {
      const error = new Error('Query failed')

      logDatabaseError(mockLogger, {
        operation: 'saveApplication',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.event.reference).toBeUndefined()
      expect(callArgs.error.message).toBe('Query failed')
    })

    it('should handle error with custom type', () => {
      class DatabaseError extends Error {
        constructor(message) {
          super(message)
          this.name = 'DatabaseError'
        }
      }

      const error = new DatabaseError('Connection pool exhausted')

      logDatabaseError(mockLogger, {
        operation: 'getLandData',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.error.type).toBe('DatabaseError')
    })
  })

  describe('logValidationWarn', () => {
    it('should log validation error with single error string', () => {
      logValidationWarn(mockLogger, {
        operation: 'payment calculation',
        errors: 'No land actions provided',
        reference: 'app-123'
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'payment calculation',
            outcome: 'failure',
            reason: 'No land actions provided',
            reference: 'app-123'
          }
        },
        'Validation failed: payment calculation'
      )
    })

    it('should log validation error with array of errors', () => {
      logValidationWarn(mockLogger, {
        operation: 'application validation',
        errors: ['Invalid parcel ID', 'Action code not found', 'Missing SBI']
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'application validation',
            outcome: 'failure',
            reason: 'Invalid parcel ID, Action code not found, Missing SBI'
          }
        },
        'Validation failed: application validation'
      )
    })

    it('should handle empty error array', () => {
      logValidationWarn(mockLogger, {
        operation: 'form validation',
        errors: []
      })

      const callArgs = mockLogger.warn.mock.calls[0][0]
      expect(callArgs.event.reason).toBe('')
    })

    it('should not include reference if not provided', () => {
      logValidationWarn(mockLogger, {
        operation: 'input validation',
        errors: 'Invalid format'
      })

      const callArgs = mockLogger.warn.mock.calls[0][0]
      expect(callArgs.event.reference).toBeUndefined()
    })
  })

  describe('logResourceNotFound', () => {
    it('should log resource not found', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Application validation run',
        reference: '12345'
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'resource',
            action: 'lookup',
            outcome: 'failure',
            reference: '12345'
          }
        },
        'Application validation run not found'
      )
    })

    it('should log resource not found with compound reference', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Land parcel',
        reference: 'sheet:123,parcel:456'
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'resource',
            action: 'lookup',
            outcome: 'failure',
            reference: 'sheet:123,parcel:456'
          }
        },
        'Land parcel not found'
      )
    })
  })

  describe('logBusinessError', () => {
    it('should log business error with all fields', () => {
      const error = new Error('Invalid state transition')

      logBusinessError(mockLogger, {
        operation: 'calculate payment',
        error,
        reference: 'landActions:5'
      })

      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          error: {
            message: 'Invalid state transition',
            stack_trace: error.stack,
            type: 'Error'
          },
          event: {
            category: 'business_logic',
            action: 'calculate payment',
            outcome: 'failure',
            reference: 'landActions:5'
          }
        },
        'Business operation failed: calculate payment'
      )
    })

    it('should log business error without reference', () => {
      const error = new Error('Calculation failed')

      logBusinessError(mockLogger, {
        operation: 'validate application',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.event.reference).toBeUndefined()
      expect(callArgs.error.message).toBe('Calculation failed')
    })

    it('should handle TypeError', () => {
      const error = new TypeError("Cannot read property 'map' of undefined")

      logBusinessError(mockLogger, {
        operation: 'process parcels',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.error.type).toBe('TypeError')
      expect(callArgs.error.message).toBe(
        "Cannot read property 'map' of undefined"
      )
    })

    it('should include stack trace', () => {
      const error = new Error('Test error')

      logBusinessError(mockLogger, {
        operation: 'test operation',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.error.stack_trace).toBeDefined()
      expect(callArgs.error.stack_trace).toContain('Error: Test error')
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined error stack', () => {
      const error = new Error('Test')
      error.stack = undefined

      logDatabaseError(mockLogger, {
        operation: 'test',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.error.stack_trace).toBeUndefined()
    })

    it('should handle error without message', () => {
      const error = new Error()

      logBusinessError(mockLogger, {
        operation: 'test',
        error
      })

      const callArgs = mockLogger.error.mock.calls[0][0]
      expect(callArgs.error.message).toBe('')
    })

    it('should convert non-array errors to string', () => {
      logValidationWarn(mockLogger, {
        operation: 'test',
        errors: 123
      })

      const callArgs = mockLogger.warn.mock.calls[0][0]
      expect(callArgs.event.reason).toBe('123')
    })
  })

  describe('Logger method calls', () => {
    it('should call logger.info for logInfo', () => {
      logInfo(mockLogger, {
        operation: 'test',
        category: 'test'
      })

      expect(mockLogger.info).toHaveBeenCalledTimes(1)
      expect(mockLogger.warn).not.toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should call logger.warn for validation warnings', () => {
      logValidationWarn(mockLogger, {
        operation: 'test',
        errors: 'test'
      })

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).not.toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should call logger.warn for resource not found', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Test',
        reference: '123'
      })

      expect(mockLogger.warn).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).not.toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should call logger.error for database errors', () => {
      logDatabaseError(mockLogger, {
        operation: 'test',
        error: new Error('test')
      })

      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })

    it('should call logger.error for business errors', () => {
      logBusinessError(mockLogger, {
        operation: 'test',
        error: new Error('test')
      })

      expect(mockLogger.error).toHaveBeenCalledTimes(1)
      expect(mockLogger.info).not.toHaveBeenCalled()
      expect(mockLogger.warn).not.toHaveBeenCalled()
    })
  })
})
