import {
  paymentCalculateResponseSchemaV1,
  paymentCalculateSchemaV1
} from './payment-calculate.schema.js'

describe('Payment Calculate Schema Validation V1', () => {
  describe('paymentCalculateSchemaV1', () => {
    const validParcel = [
      {
        sheetId: 'SD2324',
        parcelId: '1253',
        actions: [{ code: 'CSAM1', quantity: 10.63 }]
      }
    ]

    it('should validate a payload with only the required parcel field', () => {
      const result = paymentCalculateSchemaV1.validate({ parcel: validParcel })
      expect(result.error).toBeUndefined()
    })

    it('should validate a payload with all optional fields including applicationId', () => {
      const result = paymentCalculateSchemaV1.validate({
        startDate: new Date('2025-08-01'),
        sbi: '123456789',
        applicationId: 'APP-001',
        parcel: validParcel
      })
      expect(result.error).toBeUndefined()
    })

    it('should validate a payload with applicationId and without other optional fields', () => {
      const result = paymentCalculateSchemaV1.validate({
        applicationId: 'APP-001',
        parcel: validParcel
      })
      expect(result.error).toBeUndefined()
    })

    it('should validate a payload without applicationId', () => {
      const result = paymentCalculateSchemaV1.validate({
        sbi: '123456789',
        parcel: validParcel
      })
      expect(result.error).toBeUndefined()
    })

    it('should reject a non-string applicationId', () => {
      const result = paymentCalculateSchemaV1.validate({
        applicationId: 12345,
        parcel: validParcel
      })
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"applicationId" must be a string')
    })

    it('should reject missing parcel field', () => {
      const result = paymentCalculateSchemaV1.validate({
        applicationId: 'APP-001'
      })
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"parcel" is required')
    })

    it('should reject a parcel action missing a required code', () => {
      const result = paymentCalculateSchemaV1.validate({
        applicationId: 'APP-001',
        parcel: [
          {
            sheetId: 'SD2324',
            parcelId: '1253',
            actions: [{ quantity: 10.63 }]
          }
        ]
      })
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"parcel[0].actions[0].code" is required'
      )
    })
  })

  describe('paymentCalculateResponseSchemaV1', () => {
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
              unit: 'Hectare',
              quantity: 10.63,
              rateInPence: 600,
              annualPaymentPence: 12000,
              sheetId: 'SD2324',
              parcelId: '1253'
            }
          },
          agreementLevelItems: {
            1: {
              code: 'CMOR1',
              description:
                'Assess moorland and produce a written record - Agreement level part',
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

      const result = paymentCalculateResponseSchemaV1.validate(validResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain('"message" is required')
    })

    it('should reject missing payment object', () => {
      const invalidResponse = {
        message: 'Payment calculated successfully'
      }

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
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

      const result = paymentCalculateResponseSchemaV1.validate(invalidResponse)
      expect(result.error).toBeDefined()
      expect(result.error.message).toContain(
        '"payment.payments[0].totalPaymentPence" must be greater than or equal to 0'
      )
    })
  })
})
