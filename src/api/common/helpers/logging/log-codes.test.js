import { LogCodes } from './log-codes.js'

describe('LogCodes', () => {
  describe('DATABASE', () => {
    it('should generate database operation failed message', () => {
      const message = LogCodes.DATABASE.OPERATION_FAILED('getEnabledActions')
      expect(message).toBe('Database operation failed: getEnabledActions')
    })

    it('should handle operation with spaces', () => {
      const message = LogCodes.DATABASE.OPERATION_FAILED('fetch land data')
      expect(message).toBe('Database operation failed: fetch land data')
    })

    it('should handle empty operation string', () => {
      const message = LogCodes.DATABASE.OPERATION_FAILED('')
      expect(message).toBe('Database operation failed: ')
    })

    it('should handle operation with special characters', () => {
      const message = LogCodes.DATABASE.OPERATION_FAILED(
        'get-enabled-actions_v2'
      )
      expect(message).toBe('Database operation failed: get-enabled-actions_v2')
    })
  })

  describe('VALIDATION', () => {
    it('should generate validation failed message', () => {
      const message = LogCodes.VALIDATION.FAILED('payment calculation')
      expect(message).toBe('Validation failed: payment calculation')
    })

    it('should handle operation with spaces', () => {
      const message = LogCodes.VALIDATION.FAILED('application validation')
      expect(message).toBe('Validation failed: application validation')
    })

    it('should handle empty operation string', () => {
      const message = LogCodes.VALIDATION.FAILED('')
      expect(message).toBe('Validation failed: ')
    })

    it('should handle operation with special characters', () => {
      const message = LogCodes.VALIDATION.FAILED('form-validation:step-1')
      expect(message).toBe('Validation failed: form-validation:step-1')
    })
  })

  describe('RESOURCE', () => {
    it('should generate resource not found message', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND('Application validation run')
      expect(message).toBe('Application validation run not found')
    })

    it('should handle resource type with spaces', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND('Land parcel')
      expect(message).toBe('Land parcel not found')
    })

    it('should handle single word resource type', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND('Agreement')
      expect(message).toBe('Agreement not found')
    })

    it('should handle empty resource type', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND('')
      expect(message).toBe(' not found')
    })

    it('should handle resource type with special characters', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND('User-Profile')
      expect(message).toBe('User-Profile not found')
    })
  })

  describe('BUSINESS', () => {
    it('should generate business operation failed message', () => {
      const message = LogCodes.BUSINESS.OPERATION_FAILED('calculate payment')
      expect(message).toBe('Business operation failed: calculate payment')
    })

    it('should handle operation with spaces', () => {
      const message = LogCodes.BUSINESS.OPERATION_FAILED('validate application')
      expect(message).toBe('Business operation failed: validate application')
    })

    it('should handle empty operation string', () => {
      const message = LogCodes.BUSINESS.OPERATION_FAILED('')
      expect(message).toBe('Business operation failed: ')
    })

    it('should handle operation with special characters', () => {
      const message = LogCodes.BUSINESS.OPERATION_FAILED('process-parcels_v2.1')
      expect(message).toBe('Business operation failed: process-parcels_v2.1')
    })
  })

  describe('LogCodes structure', () => {
    it('should have all expected top-level categories', () => {
      expect(LogCodes).toHaveProperty('DATABASE')
      expect(LogCodes).toHaveProperty('VALIDATION')
      expect(LogCodes).toHaveProperty('RESOURCE')
      expect(LogCodes).toHaveProperty('BUSINESS')
    })

    it('should have all expected DATABASE methods', () => {
      expect(LogCodes.DATABASE).toHaveProperty('OPERATION_FAILED')
      expect(typeof LogCodes.DATABASE.OPERATION_FAILED).toBe('function')
    })

    it('should have all expected VALIDATION methods', () => {
      expect(LogCodes.VALIDATION).toHaveProperty('FAILED')
      expect(typeof LogCodes.VALIDATION.FAILED).toBe('function')
    })

    it('should have all expected RESOURCE methods', () => {
      expect(LogCodes.RESOURCE).toHaveProperty('NOT_FOUND')
      expect(typeof LogCodes.RESOURCE.NOT_FOUND).toBe('function')
    })

    it('should have all expected BUSINESS methods', () => {
      expect(LogCodes.BUSINESS).toHaveProperty('OPERATION_FAILED')
      expect(typeof LogCodes.BUSINESS.OPERATION_FAILED).toBe('function')
    })
  })

  describe('Type coercion', () => {
    it('should handle number input for DATABASE.OPERATION_FAILED', () => {
      const message = LogCodes.DATABASE.OPERATION_FAILED(123)
      expect(message).toBe('Database operation failed: 123')
    })

    it('should handle undefined input for VALIDATION.FAILED', () => {
      const message = LogCodes.VALIDATION.FAILED(undefined)
      expect(message).toBe('Validation failed: undefined')
    })

    it('should handle null input for RESOURCE.NOT_FOUND', () => {
      const message = LogCodes.RESOURCE.NOT_FOUND(null)
      expect(message).toBe('null not found')
    })

    it('should handle object input for BUSINESS.OPERATION_FAILED', () => {
      const message = LogCodes.BUSINESS.OPERATION_FAILED({ name: 'test' })
      expect(message).toBe('Business operation failed: [object Object]')
    })
  })

  describe('Message consistency', () => {
    it('should produce consistent messages for same input', () => {
      const operation = 'test operation'
      const message1 = LogCodes.DATABASE.OPERATION_FAILED(operation)
      const message2 = LogCodes.DATABASE.OPERATION_FAILED(operation)
      expect(message1).toBe(message2)
    })

    it('should produce different messages for different inputs', () => {
      const message1 = LogCodes.DATABASE.OPERATION_FAILED('operation1')
      const message2 = LogCodes.DATABASE.OPERATION_FAILED('operation2')
      expect(message1).not.toBe(message2)
    })
  })

  describe('Integration with log helpers', () => {
    it('should work with logDatabaseError message format', () => {
      const operation = 'getEnabledActions'
      const message = LogCodes.DATABASE.OPERATION_FAILED(operation)
      expect(message).toMatch(/^Database operation failed: /)
      expect(message).toContain(operation)
    })

    it('should work with logValidationWarn message format', () => {
      const operation = 'payment calculation'
      const message = LogCodes.VALIDATION.FAILED(operation)
      expect(message).toMatch(/^Validation failed: /)
      expect(message).toContain(operation)
    })

    it('should work with logResourceNotFound message format', () => {
      const resourceType = 'Land parcel'
      const message = LogCodes.RESOURCE.NOT_FOUND(resourceType)
      expect(message).toMatch(/not found$/)
      expect(message).toContain(resourceType)
    })

    it('should work with logBusinessError message format', () => {
      const operation = 'calculate payment'
      const message = LogCodes.BUSINESS.OPERATION_FAILED(operation)
      expect(message).toMatch(/^Business operation failed: /)
      expect(message).toContain(operation)
    })
  })
})
