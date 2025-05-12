import { PaymentCalculateResponseSchema } from './payment-calculate.schema.js'

describe('Payment Calculate Schema Validation', () => {
  describe('PaymentCalculateResponseSchema', () => {
    it('should validate correct payment calculate response', () => {
      const validResponse = {
        message: 'Payment calculated successfully',
        payment: {
          total: 1250.5
        }
      }

      const result = PaymentCalculateResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should validate response with zero payment total', () => {
      const validResponse = {
        message: 'Payment calculated successfully',
        payment: {
          total: 0
        }
      }

      const result = PaymentCalculateResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalidResponse = {
        payment: {
          total: 1250.5
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"message" is required')
    })

    it('should reject missing payment object', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully'
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"payment" is required')
    })

    it('should reject missing payment total', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {}
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"payment.total" is required')
    })

    it('should reject non-number payment total', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          total: 'not-a-number'
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"payment.total" must be a number')
    })
  })
})
