import {
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
} from './ingest.schema.js'

describe('initiateLandDataUploadSuccessResponseSchema', () => {
  const validData = {
    message: 'Upload URL generated successfully',
    uploadUrl: 'https://s3.amazonaws.com/bucket/key'
  }

  it('should validate valid data', () => {
    const { error } =
      initiateLandDataUploadSuccessResponseSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing message', () => {
    const data = {
      uploadUrl: 'https://s3.amazonaws.com/bucket/key'
    }
    const { error } = initiateLandDataUploadSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('message')
  })

  it('should reject missing uploadUrl', () => {
    const data = {
      message: 'Upload URL generated successfully'
    }
    const { error } = initiateLandDataUploadSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('uploadUrl')
  })

  it('should reject invalid message type', () => {
    const data = {
      message: 123,
      uploadUrl: 'https://s3.amazonaws.com/bucket/key'
    }
    const { error } = initiateLandDataUploadSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })

  it('should reject invalid uploadUrl type', () => {
    const data = {
      message: 'Upload URL generated successfully',
      uploadUrl: 123
    }
    const { error } = initiateLandDataUploadSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })
})

describe('initiateLandDataUploadRequestSchema', () => {
  const validData = {
    reference: 'REF-123456',
    customerId: 'CUST-789',
    resource: 'land_parcels'
  }

  it('should validate valid data', () => {
    const { error } = initiateLandDataUploadRequestSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing reference', () => {
    const data = {
      customerId: 'CUST-789',
      resource: 'land_parcels'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('reference')
  })

  it('should reject missing customerId', () => {
    const data = {
      reference: 'REF-123456',
      resource: 'parcels'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('customerId')
  })

  it('should reject missing resource', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('resource')
  })

  it('should reject invalid reference type', () => {
    const data = {
      reference: 123,
      customerId: 'CUST-789',
      resource: 'parcels'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })

  it('should reject invalid customerId type', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 123,
      resource: 'parcels'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })

  it('should reject invalid resource type', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 123
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toMatch(/must be one of|must be a string/)
  })

  it('should reject invalid resource value', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 'invalid-resource'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('parcels')
  })

  it.each([['land_parcels'], ['land_covers'], ['moorland_designations']])(
    'should accept valid resource value - %s',
    (resource) => {
      const data = {
        reference: 'REF-123456',
        customerId: 'CUST-789',
        resource
      }
      const { error } = initiateLandDataUploadRequestSchema.validate(data)
      expect(error).toBeUndefined()
    }
  )
})
