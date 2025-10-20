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
    it('should log info with all fields using nested objects', () => {
      logInfo(mockLogger, {
        category: 'payment',
        message: 'Payment calculated successfully'
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'payment',
            type: 'info'
          }
        },
        'Payment calculated successfully'
      )
    })

    it('should log info with context in message', () => {
      logInfo(mockLogger, {
        category: 'application',
        message: 'Application validated',
        context: { applicationId: 'APP-123' }
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'application',
            type: 'info'
          }
        },
        'Application validated [applicationId=APP-123]'
      )
    })

    it('should log info without context', () => {
      logInfo(mockLogger, {
        operation: 'fetch parcels',
        category: 'parcel',
        message: 'Parcels fetched'
      })

      const message = mockLogger.info.mock.calls[0][1]
      expect(message).toBe('Parcels fetched')
      expect(message).not.toContain('[')
    })
  })

  describe('logDatabaseError', () => {
    it('should log database error with nested ECS structure', () => {
      const error = new Error('Connection timeout')

      logDatabaseError(mockLogger, {
        operation: 'getEnabledActions',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData).toHaveProperty('error')
      expect(logData.error).toEqual({
        message: 'Connection timeout',
        stack_trace: error.stack,
        type: 'Error'
      })
      expect(logData).toHaveProperty('event')
      expect(logData.event).toEqual({
        category: 'database',
        action: 'getEnabledActions',
        type: 'error'
      })
    })

    it('should include context in message', () => {
      const error = new Error('Query failed')

      logDatabaseError(mockLogger, {
        operation: 'getLandData',
        error,
        context: { sheetId: '123', parcelId: '456' }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toBe(
        'Database operation failed: getLandData [sheetId=123 | parcelId=456]'
      )
    })

    it('should work without context', () => {
      const error = new Error('Query failed')

      logDatabaseError(mockLogger, {
        operation: 'saveApplication',
        error
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toBe('Database operation failed: saveApplication')
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

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData.error.type).toBe('DatabaseError')
      expect(logData.error.message).toBe('Connection pool exhausted')
    })

    it('should use nested objects not flattened keys', () => {
      const error = new Error('Test')

      logDatabaseError(mockLogger, {
        operation: 'test',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(typeof logData.error).toBe('object')
      expect(typeof logData.event).toBe('object')
      expect(logData['error.message']).toBeUndefined()
      expect(logData['event.category']).toBeUndefined()
    })
  })

  describe('logValidationWarn', () => {
    it('should log validation error with single error string', () => {
      logValidationWarn(mockLogger, {
        operation: 'payment calculation',
        errors: 'No land actions provided'
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'payment calculation',
            type: 'warn',
            reason: 'No land actions provided'
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

      const logData = mockLogger.warn.mock.calls[0][0]
      expect(logData.event.reason).toBe(
        'Invalid parcel ID, Action code not found, Missing SBI'
      )
    })

    it('should include context in message', () => {
      logValidationWarn(mockLogger, {
        operation: 'application validation',
        errors: ['Invalid parcel'],
        context: { applicationId: 'APP-123', sbi: '987654321' }
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toBe(
        'Validation failed: application validation [applicationId=APP-123 | sbi=987654321]'
      )
    })

    it('should work without context', () => {
      logValidationWarn(mockLogger, {
        operation: 'form validation',
        errors: 'Invalid format'
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toBe('Validation failed: form validation')
    })

    it('should handle empty error array', () => {
      logValidationWarn(mockLogger, {
        operation: 'test',
        errors: []
      })

      const logData = mockLogger.warn.mock.calls[0][0]
      expect(logData.event.reason).toBe('')
    })

    it('should convert non-array errors to string', () => {
      logValidationWarn(mockLogger, {
        operation: 'test',
        errors: 123
      })

      const logData = mockLogger.warn.mock.calls[0][0]
      expect(logData.event.reason).toBe('123')
    })
  })

  describe('logResourceNotFound', () => {
    it('should log resource not found with nested structure', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Application validation run',
        context: { id: '12345' }
      })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'resource',
            action: 'lookup',
            type: 'warn'
          }
        },
        'Application validation run not found [id=12345]'
      )
    })

    it('should include multiple identifiers in message', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Land parcel',
        context: { sheetId: '123', parcelId: '456' }
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toBe('Land parcel not found [sheetId=123 | parcelId=456]')
    })

    it('should work with single identifier', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'Agreement',
        context: { agreementId: 'AGR-789' }
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toBe('Agreement not found [agreementId=AGR-789]')
    })
  })

  describe('logBusinessError', () => {
    it('should log business error with nested ECS structure', () => {
      const error = new Error('Invalid state transition')

      logBusinessError(mockLogger, {
        operation: 'calculate payment',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData).toHaveProperty('error')
      expect(logData.error).toEqual({
        message: 'Invalid state transition',
        stack_trace: error.stack,
        type: 'Error'
      })
      expect(logData).toHaveProperty('event')
      expect(logData.event).toEqual({
        category: 'business_logic',
        action: 'calculate payment',
        type: 'error'
      })
    })

    it('should include context in message', () => {
      const error = new Error('Calculation failed')

      logBusinessError(mockLogger, {
        operation: 'calculate payment',
        error,
        context: { applicationId: 'APP-789', landActionsCount: 5 }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toBe(
        'Business operation failed: calculate payment [applicationId=APP-789 | landActionsCount=5]'
      )
    })

    it('should work without context', () => {
      const error = new Error('Test error')

      logBusinessError(mockLogger, {
        operation: 'validate application',
        error
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toBe('Business operation failed: validate application')
    })

    it('should handle TypeError', () => {
      const error = new TypeError("Cannot read property 'map' of undefined")

      logBusinessError(mockLogger, {
        operation: 'process parcels',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData.error.type).toBe('TypeError')
      expect(logData.error.message).toBe(
        "Cannot read property 'map' of undefined"
      )
    })

    it('should include stack trace', () => {
      const error = new Error('Test error')

      logBusinessError(mockLogger, {
        operation: 'test operation',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData.error.stack_trace).toBeDefined()
      expect(logData.error.stack_trace).toContain('Error: Test error')
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

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData.error.stack_trace).toBeUndefined()
    })

    it('should handle error without message', () => {
      const error = new Error()

      logBusinessError(mockLogger, {
        operation: 'test',
        error
      })

      const logData = mockLogger.error.mock.calls[0][0]
      expect(logData.error.message).toBe('')
    })

    it('should handle context with numeric values', () => {
      logDatabaseError(mockLogger, {
        operation: 'test',
        error: new Error('test'),
        context: { count: 5, id: 123 }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toContain('[count=5 | id=123]')
    })

    it('should handle context with boolean values', () => {
      logDatabaseError(mockLogger, {
        operation: 'test',
        error: new Error('test'),
        context: { isActive: true, hasErrors: false }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toContain('[isActive=true | hasErrors=false]')
    })

    it('should handle context with special characters in values', () => {
      logDatabaseError(mockLogger, {
        operation: 'test',
        error: new Error('test'),
        context: { path: '/api/v1/test', query: 'name=John&age=30' }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toContain('[path=/api/v1/test | query=name=John&age=30]')
    })
  })

  describe('Nested object structure validation', () => {
    it('should use nested event objects not flattened keys', () => {
      const error = new Error('test')

      logDatabaseError(mockLogger, { operation: 'test', error })
      logBusinessError(mockLogger, { operation: 'test', error })

      mockLogger.error.mock.calls.forEach((call) => {
        const logObject = call[0]
        expect(typeof logObject.event).toBe('object')
        expect(logObject.event).toHaveProperty('category')
        expect(logObject.event).toHaveProperty('action')
        expect(logObject.event).toHaveProperty('type')
      })
    })

    it('should use nested error objects not flattened keys', () => {
      const error = new Error('test')

      logDatabaseError(mockLogger, { operation: 'test', error })
      logBusinessError(mockLogger, { operation: 'test', error })

      mockLogger.error.mock.calls.forEach((call) => {
        const logObject = call[0]
        expect(typeof logObject.error).toBe('object')
        expect(logObject.error).toHaveProperty('message')
        expect(logObject.error).toHaveProperty('stack_trace')
        expect(logObject.error).toHaveProperty('type')
      })
    })
  })

  describe('Context formatting in messages', () => {
    it('should format context correctly for database errors', () => {
      logDatabaseError(mockLogger, {
        operation: 'getLandData',
        error: new Error('test'),
        context: { sheetId: '123', parcelId: '456', sbi: '789' }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toMatch(
        /Database operation failed: getLandData \[sheetId=123 \| parcelId=456 \| sbi=789\]/
      )
    })

    it('should format context correctly for validation errors', () => {
      logValidationWarn(mockLogger, {
        operation: 'form validation',
        errors: 'invalid',
        context: { formId: 'FORM-1', fieldName: 'email' }
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toMatch(
        /Validation failed: form validation \[formId=FORM-1 \| fieldName=email\]/
      )
    })

    it('should format context correctly for resource not found', () => {
      logResourceNotFound(mockLogger, {
        resourceType: 'User',
        context: { userId: 'USER-123', email: 'test@example.com' }
      })

      const message = mockLogger.warn.mock.calls[0][1]
      expect(message).toMatch(
        /User not found \[userId=USER-123 \| email=test@example.com\]/
      )
    })

    it('should format context correctly for business errors', () => {
      logBusinessError(mockLogger, {
        operation: 'process transaction',
        error: new Error('test'),
        context: { transactionId: 'TXN-999', amount: 100.5 }
      })

      const message = mockLogger.error.mock.calls[0][1]
      expect(message).toMatch(
        /Business operation failed: process transaction \[transactionId=TXN-999 \| amount=100.5\]/
      )
    })
  })
})
