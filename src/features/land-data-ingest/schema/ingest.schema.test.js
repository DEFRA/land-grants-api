import {
  ingestSuccessResponseSchema,
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
} from './ingest.schema.js'

describe('ingestScheduleSuccessResponseSchema', () => {
  const validData = {
    message: 'Ingest scheduled successfully',
    taskId: 123
  }

  it('should validate valid data', () => {
    const { error } = ingestSuccessResponseSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing message', () => {
    const data = {
      taskId: 123
    }
    const { error } = ingestSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('message')
  })

  it('should reject missing taskId', () => {
    const data = {
      message: 'Ingest scheduled successfully'
    }
    const { error } = ingestSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('taskId')
  })

  it('should reject invalid taskId type', () => {
    const data = {
      message: 'Ingest scheduled successfully',
      taskId: 'not-a-number'
    }
    const { error } = ingestSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('number')
  })

  it('should reject non-integer taskId', () => {
    const data = {
      message: 'Ingest scheduled successfully',
      taskId: 123.45
    }
    const { error } = ingestSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('integer')
  })
})

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

  it('should accept valid resource value - parcels', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 'land_parcels'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeUndefined()
  })

  it('should accept valid resource value - covers', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 'land_covers'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeUndefined()
  })

  it('should accept valid resource value - moorland', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 'CUST-789',
      resource: 'moorland_designations'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeUndefined()
  })
})
