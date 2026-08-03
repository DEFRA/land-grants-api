import {
  cdpUploaderCallbackSchema,
  cdpUploaderCallbackResponseSchema
} from './land-data-ingest.schema.js'

describe('cdpUploaderCallbackSchema', () => {
  const validData = {
    uploadStatus: 'ready',
    numberOfRejectedFiles: 0,
    metadata: {
      customerId: '1234',
      accountId: '1234'
    },
    form: {
      file: {
        s3Key: 'parcels/parcels_head.csv',
        fileStatus: 'complete',
        hasError: false
      }
    }
  }

  it('should validate valid data', () => {
    const { error } = cdpUploaderCallbackSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should allow optional fields to be omitted', () => {
    const { error } = cdpUploaderCallbackSchema.validate({
      uploadStatus: 'ready'
    })
    expect(error).toBeUndefined()
  })

  it('should reject missing uploadStatus', () => {
    const { numberOfRejectedFiles, metadata, form } = validData
    const { error } = cdpUploaderCallbackSchema.validate({
      numberOfRejectedFiles,
      metadata,
      form
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('uploadStatus')
  })

  it('should reject invalid uploadStatus value', () => {
    const { error } = cdpUploaderCallbackSchema.validate({
      ...validData,
      uploadStatus: 'unknown'
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('uploadStatus')
  })

  it('should accept all valid uploadStatus values', () => {
    for (const uploadStatus of ['initiated', 'pending', 'ready']) {
      const { error } = cdpUploaderCallbackSchema.validate({
        ...validData,
        uploadStatus
      })
      expect(error).toBeUndefined()
    }
  })

  it('should reject non-integer numberOfRejectedFiles', () => {
    const { error } = cdpUploaderCallbackSchema.validate({
      ...validData,
      numberOfRejectedFiles: 1.5
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('integer')
  })

  it('should reject invalid numberOfRejectedFiles type', () => {
    const { error } = cdpUploaderCallbackSchema.validate({
      ...validData,
      numberOfRejectedFiles: 'not-a-number'
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('number')
  })

  describe('form.file', () => {
    it('should validate a fully populated file object', () => {
      const { error } = cdpUploaderCallbackSchema.validate({
        ...validData,
        form: {
          file: {
            fileId: 'abc-123',
            filename: 'parcels.csv',
            contentType: 'text/csv',
            fileStatus: 'complete',
            contentLength: 1024,
            checksumSha256: 'abc123def456',
            s3Key: 'parcels/parcels.csv',
            s3Bucket: 'my-bucket',
            hasError: false,
            errorMessage: 'File type not supported',
            detectedContentType: 'text/csv'
          }
        }
      })
      expect(error).toBeUndefined()
    })

    it('should reject invalid fileStatus value', () => {
      const { error } = cdpUploaderCallbackSchema.validate({
        ...validData,
        form: {
          file: {
            ...validData.form.file,
            fileStatus: 'invalid-status'
          }
        }
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('fileStatus')
    })

    it('should accept all valid fileStatus values', () => {
      for (const fileStatus of ['pending', 'complete', 'rejected']) {
        const { error } = cdpUploaderCallbackSchema.validate({
          ...validData,
          form: {
            file: {
              ...validData.form.file,
              fileStatus
            }
          }
        })
        expect(error).toBeUndefined()
      }
    })

    it('should reject non-integer contentLength', () => {
      const { error } = cdpUploaderCallbackSchema.validate({
        ...validData,
        form: {
          file: {
            ...validData.form.file,
            contentLength: 1024.5
          }
        }
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('integer')
    })

    it('should reject invalid hasError type', () => {
      const { error } = cdpUploaderCallbackSchema.validate({
        ...validData,
        form: {
          file: {
            ...validData.form.file,
            hasError: 'yes'
          }
        }
      })
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('boolean')
    })
  })
})

describe('cdpUploaderCallbackResponseSchema', () => {
  it('should validate valid data', () => {
    const { error } = cdpUploaderCallbackResponseSchema.validate({
      message: 'Upload received'
    })
    expect(error).toBeUndefined()
  })

  it('should reject missing message', () => {
    const { error } = cdpUploaderCallbackResponseSchema.validate({})
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('message')
  })

  it('should reject invalid message type', () => {
    const { error } = cdpUploaderCallbackResponseSchema.validate({
      message: 123
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })
})
