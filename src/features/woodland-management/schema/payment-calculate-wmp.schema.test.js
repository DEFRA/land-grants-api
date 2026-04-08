import {
  paymentCalculateWMPResponseSchema,
  paymentCalculateWMPSchemaV2
} from './payment-calculate-wmp.schema.js'

describe('paymentCalculateWMPResponseSchema', () => {
  const createValidResponse = () => ({
    message: 'success',
    payment: {
      explanations: [],
      agreementStartDate: '2024-01-01',
      agreementEndDate: '2029-01-01',
      frequency: 'Single',
      agreementTotalPence: 1500,
      parcelItems: {},
      agreementLevelItems: {
        1: {
          code: 'PA3',
          description: 'Woodland Management Plan',
          version: '1.0.0',
          parcelIds: ['SX067-99238'],
          activePaymentTier: 1,
          quantityInActiveTier: 24.5,
          activeTierRatePence: 0,
          activeTierFlatRatePence: 1500,
          agreementTotalPence: 1500,
          unit: 'ha',
          quantity: 25
        }
      },
      payments: [
        {
          totalPaymentPence: 1500,
          paymentDate: '2024-01-01',
          lineItems: [
            {
              agreementLevelItemId: 1,
              paymentPence: 1500
            }
          ]
        }
      ]
    }
  })

  it('should validate a correct response', () => {
    const result = paymentCalculateWMPResponseSchema.validate(
      createValidResponse()
    )
    expect(result.error).toBeUndefined()
  })

  it('should reject a missing message', () => {
    const invalid = { ...createValidResponse() }
    delete invalid.message
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"message" is required')
  })

  it('should return a result if rules validation fails', () => {
    const invalid = { ...createValidResponse() }
    delete invalid.payment
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeUndefined()
  })

  it('should reject a missing payment.agreementStartDate', () => {
    const invalid = createValidResponse()
    delete invalid.payment.agreementStartDate
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementStartDate" is required'
    )
  })

  it('should reject a missing payment.agreementEndDate', () => {
    const invalid = createValidResponse()
    delete invalid.payment.agreementEndDate
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementEndDate" is required'
    )
  })

  it('should reject a missing payment.frequency', () => {
    const invalid = createValidResponse()
    delete invalid.payment.frequency
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"payment.frequency" is required')
  })

  it('should reject a missing payment.agreementTotalPence', () => {
    const invalid = createValidResponse()
    delete invalid.payment.agreementTotalPence
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementTotalPence" is required'
    )
  })

  it('should reject a missing payment.payments array', () => {
    const invalid = createValidResponse()
    delete invalid.payment.payments
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"payment.payments" is required')
  })

  it('should reject a missing totalPaymentPence in a payments entry', () => {
    const invalid = createValidResponse()
    delete invalid.payment.payments[0].totalPaymentPence
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.payments[0].totalPaymentPence" is required'
    )
  })

  it('should reject a missing paymentDate in a payments entry', () => {
    const invalid = createValidResponse()
    delete invalid.payment.payments[0].paymentDate
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.payments[0].paymentDate" is required'
    )
  })

  it('should reject a missing lineItems in a payments entry', () => {
    const invalid = createValidResponse()
    delete invalid.payment.payments[0].lineItems
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.payments[0].lineItems" is required'
    )
  })

  it('should reject a non-integer activePaymentTier', () => {
    const invalid = createValidResponse()
    invalid.payment.agreementLevelItems[1].activePaymentTier = 1.5
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementLevelItems.1.activePaymentTier" must be an integer'
    )
  })

  it('should reject a missing activePaymentTier', () => {
    const invalid = createValidResponse()
    delete invalid.payment.agreementLevelItems[1].activePaymentTier
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementLevelItems.1.activePaymentTier" is required'
    )
  })

  it('should reject a missing activeTierRatePence', () => {
    const invalid = createValidResponse()
    delete invalid.payment.agreementLevelItems[1].activeTierRatePence
    const result = paymentCalculateWMPResponseSchema.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"payment.agreementLevelItems.1.activeTierRatePence" is required'
    )
  })
})

describe('paymentCalculateWMPSchemaV2', () => {
  const createValidPayload = () => ({
    parcelIds: ['SX067-99238'],
    oldWoodlandAreaHa: 10,
    newWoodlandAreaHa: 5,
    startDate: '2024-01-01'
  })

  it('should validate a correct payload', () => {
    const result = paymentCalculateWMPSchemaV2.validate(createValidPayload())
    expect(result.error).toBeUndefined()
  })

  it('should validate a payload without the optional startDate', () => {
    const payload = { ...createValidPayload() }
    delete payload.startDate
    const result = paymentCalculateWMPSchemaV2.validate(payload)
    expect(result.error).toBeUndefined()
  })

  it('should reject a missing parcelIds', () => {
    const invalid = { ...createValidPayload() }
    delete invalid.parcelIds
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"parcelIds" is required')
  })

  it('should reject a missing oldWoodlandAreaHa', () => {
    const invalid = { ...createValidPayload() }
    delete invalid.oldWoodlandAreaHa
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"oldWoodlandAreaHa" is required')
  })

  it('should reject a missing newWoodlandAreaHa', () => {
    const invalid = { ...createValidPayload() }
    delete invalid.newWoodlandAreaHa
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"newWoodlandAreaHa" is required')
  })

  it('should reject a non-positive newWoodlandAreaHa', () => {
    const invalid = { ...createValidPayload(), newWoodlandAreaHa: -5 }
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.details[0].message).toContain(
      '"newWoodlandAreaHa" must be greater than or equal to 0'
    )
  })

  it('should reject an empty parcelIds array', () => {
    const invalid = { ...createValidPayload(), parcelIds: [] }
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain(
      '"parcelIds" must contain at least 1 items'
    )
  })

  it('should reject a non-array parcelIds', () => {
    const invalid = { ...createValidPayload(), parcelIds: 'SX067-99238' }
    const result = paymentCalculateWMPSchemaV2.validate(invalid)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('"parcelIds" must be an array')
  })
})
