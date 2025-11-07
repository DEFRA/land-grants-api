import {
  ingestScheduleSuccessResponseSchema,
  initiateLandDataUploadSuccessResponseSchema,
  initiateLandDataUploadRequestSchema
} from './ingest-schedule.schema.js'

describe('ingestScheduleSuccessResponseSchema', () => {
  const validData = {
    message: 'Ingest scheduled successfully',
    taskId: 123
  }

  it('should validate valid data', () => {
    const { error } = ingestScheduleSuccessResponseSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing message', () => {
    const data = {
      taskId: 123
    }
    const { error } = ingestScheduleSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('message')
  })

  it('should reject missing taskId', () => {
    const data = {
      message: 'Ingest scheduled successfully'
    }
    const { error } = ingestScheduleSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('taskId')
  })

  it('should reject invalid taskId type', () => {
    const data = {
      message: 'Ingest scheduled successfully',
      taskId: 'not-a-number'
    }
    const { error } = ingestScheduleSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('number')
  })

  it('should reject non-integer taskId', () => {
    const data = {
      message: 'Ingest scheduled successfully',
      taskId: 123.45
    }
    const { error } = ingestScheduleSuccessResponseSchema.validate(data)
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
    customerId: 'CUST-789'
  }

  it('should validate valid data', () => {
    const { error } = initiateLandDataUploadRequestSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing reference', () => {
    const data = {
      customerId: 'CUST-789'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('reference')
  })

  it('should reject missing customerId', () => {
    const data = {
      reference: 'REF-123456'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('customerId')
  })

  it('should reject invalid reference type', () => {
    const data = {
      reference: 123,
      customerId: 'CUST-789'
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })

  it('should reject invalid customerId type', () => {
    const data = {
      reference: 'REF-123456',
      customerId: 123
    }
    const { error } = initiateLandDataUploadRequestSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })
})
