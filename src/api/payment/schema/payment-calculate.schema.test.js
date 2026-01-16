import {
  PaymentCalculateResponseSchema,
  paymentCalculateSchema
} from './payment-calculate.schema.js'

describe('Payment Calculate Schema Validation', () => {
  describe('PaymentCalculateResponseSchema', () => {
    it('should validate correct payment calculate response', () => {
      const validResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          parcelItems: {
            1: {
              code: 'CSAM1',
              description:
                'Assess soil, test soil organic matter and produce a soil management plan',
              version: '1.0.0',
              unit: 'Hectare',
              quantity: 10.63,
              rateInPence: 600,
              annualPaymentPence: 12000,
              durationYears: 3,
              sheetId: 'SD2324',
              parcelId: '1253'
            }
          },
          agreementLevelItems: {
            1: {
              code: 'CMOR1',
              description:
                'Assess moorland and produce a written record - Agreement level part',
              version: '1.0.0',
              durationYears: 3,
              annualPaymentPence: 27200
            }
          },
          payments: [
            {
              totalPaymentPence: 25000,
              paymentDate: '2025-08-05',
              lineItems: [
                {
                  parcelItemId: 1,
                  paymentPence: 1000
                },
                {
                  agreementLevelItemId: 1,
                  paymentPence: 2266
                }
              ]
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should validate response with zero payment total', () => {
      const validResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Monthly',
          agreementTotalPence: 0,
          annualTotalPence: 0,
          payments: [
            {
              totalPaymentPence: 0,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(validResponse)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing message', () => {
      const invalidResponse = {
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: [
            {
              totalPaymentPence: 25000,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
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

    it('should reject missing payment.agreementStartDate', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: [
            {
              totalPaymentPence: 25000,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.agreementStartDate" is required'
      )
    })

    it('should reject missing payment.payments array', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"payment.payments" is required')
    })

    it('should reject empty payments array', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: []
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.payments" must contain at least 1 items'
      )
    })

    it('should reject invalid frequency', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'InvalidFrequency',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: [
            {
              totalPaymentPence: 25000,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.frequency" must be one of [Monthly, Quarterly, Annually]'
      )
    })

    it('should reject invalid date format', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: 'invalid-date',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: [
            {
              totalPaymentPence: 25000,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.agreementStartDate" must be in iso format'
      )
    })

    it('should reject negative payment total', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully',
        payment: {
          agreementStartDate: '2025-08-01',
          agreementEndDate: '2028-08-01',
          frequency: 'Quarterly',
          agreementTotalPence: 300000,
          annualTotalPence: 100000,
          payments: [
            {
              totalPaymentPence: -1000,
              paymentDate: '2025-08-05',
              lineItems: []
            }
          ]
        }
      }

      const result = PaymentCalculateResponseSchema.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.payments[0].totalPaymentPence" must be greater than or equal to 0'
      )
    })
  })

  describe('paymentCalculateSchema', () => {
    it('should validate correct payment calculate request', () => {
      const validRequest = {
        parcel: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            actions: [
              {
                code: 'BND1',
                quantity: 99.0
              }
            ]
          }
        ]
      }

      const result = paymentCalculateSchema.validate(validRequest)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing parcel array', () => {
      const invalidRequest = {
        startDate: '2025-08-01',
        sbi: '123456789'
      }

      const result = paymentCalculateSchema.validate(invalidRequest)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"parcel" is required')
    })

    it('should reject missing sheetId in parcel item', () => {
      const invalidRequest = {
        parcel: [
          {
            parcelId: '9238',
            actions: [
              {
                code: 'BND1',
                quantity: 99.0
              }
            ]
          }
        ]
      }

      const result = paymentCalculateSchema.validate(invalidRequest)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"parcel[0].sheetId" is required')
    })

    it('should reject missing actions array in parcel item', () => {
      const invalidRequest = {
        parcel: [
          {
            sheetId: 'SX0679',
            parcelId: '9238'
          }
        ]
      }

      const result = paymentCalculateSchema.validate(invalidRequest)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"parcel[0].actions" is required')
    })

    it('should reject missing code in action', () => {
      const invalidRequest = {
        parcel: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            actions: [
              {
                quantity: 99.0
              }
            ]
          }
        ]
      }

      const result = paymentCalculateSchema.validate(invalidRequest)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"parcel[0].actions[0].code" is required'
      )
    })

    it('should reject invalid quantity in action', () => {
      const invalidRequest = {
        parcel: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            actions: [
              {
                code: 'BND1',
                quantity: -10
              }
            ]
          }
        ]
      }

      const result = paymentCalculateSchema.validate(invalidRequest)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"parcel[0].actions[0].quantity" must be a positive number'
      )
    })
  })
})
