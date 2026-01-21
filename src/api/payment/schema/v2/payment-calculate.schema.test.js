import { PaymentCalculateResponseSchemaV2 } from './payment-calculate.schema.js'

describe('Payment Calculate Schema Validation V2', () => {
  describe('PaymentCalculateResponseSchemaV2', () => {
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

      const result = PaymentCalculateResponseSchemaV2.validate(validResponse)
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"message" is required')
    })

    it('should reject missing payment object', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully'
      }

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"payment.payments" is required')
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
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

      const result = PaymentCalculateResponseSchemaV2.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.payments[0].totalPaymentPence" must be greater than or equal to 0'
      )
    })
  })
})
