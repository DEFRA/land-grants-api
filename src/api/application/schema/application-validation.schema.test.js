import {
  applicationValidationSchema,
  applicationValidationRunSchema,
  applicationValidationRunRequestSchema,
  applicationValidationRunResponseSchema,
  applicationValidationResponseSchema,
  applicationValidationRunsBodyRequestSchema
} from './application-validation.schema.js'

describe('Application Validation Schema', () => {
  describe('applicationValidationSchema', () => {
    const validData = {
      applicationId: 'app-123',
      requester: 'user@example.com',
      applicantCrn: 'CRN123456',
      sbi: 123456789,
      landActions: [
        {
          sheetId: 'sheet-1',
          parcelId: 'parcel-1',
          actions: [
            { code: 'ACTION1', quantity: 10 },
            { code: 'ACTION2', quantity: 5 }
          ]
        }
      ]
    }

    it('should validate valid data', () => {
      const { error } = applicationValidationSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should require applicationId', () => {
      const data = { ...validData }
      delete data.applicationId
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('applicationId')
    })

    it('should require requester', () => {
      const data = { ...validData }
      delete data.requester
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('requester')
    })

    it('should require applicantCrn', () => {
      const data = { ...validData }
      delete data.applicantCrn
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('applicantCrn')
    })

    it('should require sbi as integer', () => {
      const data = { ...validData, sbi: 'not-a-number' }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('sbi')
    })

    it('should require landActions array with minimum 1 item', () => {
      const data = { ...validData, landActions: [] }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('landActions')
    })

    it('should require landActions to have sheetId', () => {
      const data = {
        ...validData,
        landActions: [{ parcelId: 'parcel-1', actions: [] }]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('sheetId')
    })

    it('should require landActions to have parcelId', () => {
      const data = {
        ...validData,
        landActions: [{ sheetId: 'sheet-1', actions: [] }]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('parcelId')
    })

    it('should require actions array in landActions', () => {
      const data = {
        ...validData,
        landActions: [{ sheetId: 'sheet-1', parcelId: 'parcel-1' }]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('actions')
    })

    it('should require actions to have code', () => {
      const data = {
        ...validData,
        landActions: [
          {
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            actions: [{ quantity: 10 }]
          }
        ]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('code')
    })

    it('should require actions to have quantity', () => {
      const data = {
        ...validData,
        landActions: [
          {
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            actions: [{ code: 'ACTION1' }]
          }
        ]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error.details[0].message).toContain('quantity')
    })

    it('should accept multiple landActions', () => {
      const data = {
        ...validData,
        landActions: [
          {
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            actions: [{ code: 'ACTION1', quantity: 10 }]
          },
          {
            sheetId: 'sheet-2',
            parcelId: 'parcel-2',
            actions: [{ code: 'ACTION2', quantity: 5 }]
          }
        ]
      }
      const { error } = applicationValidationSchema.validate(data)
      expect(error).toBeUndefined()
    })
  })

  describe('applicationValidationRunSchema', () => {
    const validData = {
      id: 123,
      application_id: 'app-123',
      sbi: '123456789',
      crn: 'CRN123456',
      data: { some: 'data' },
      created_at: new Date()
    }

    it('should validate valid data', () => {
      const { error } = applicationValidationRunSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should require id as integer', () => {
      const data = { ...validData, id: 'not-a-number' }
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('id')
    })

    it('should require application_id', () => {
      const data = { ...validData }
      delete data.application_id
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('application_id')
    })

    it('should require sbi', () => {
      const data = { ...validData }
      delete data.sbi
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('sbi')
    })

    it('should require crn', () => {
      const data = { ...validData }
      delete data.crn
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('crn')
    })

    it('should require data object', () => {
      const data = { ...validData }
      delete data.data
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('data')
    })

    it('should require created_at as date', () => {
      const data = { ...validData, created_at: 'not-a-date' }
      const { error } = applicationValidationRunSchema.validate(data)
      expect(error.details[0].message).toContain('created_at')
    })
  })

  describe('applicationValidationRunRequestSchema', () => {
    const validData = {
      id: 123
    }

    it('should validate valid data', () => {
      const { error } =
        applicationValidationRunRequestSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should require id as integer', () => {
      const data = { id: 'not-a-number' }
      const { error } = applicationValidationRunRequestSchema.validate(data)
      expect(error.details[0].message).toContain('id')
    })

    it('should require id', () => {
      const data = {}
      const { error } = applicationValidationRunRequestSchema.validate(data)
      expect(error.details[0].message).toContain('id')
    })
  })

  describe('applicationValidationRunResponseSchema', () => {
    const validData = {
      message: 'Validation completed',
      applicationValidationRun: {
        id: 123,
        application_id: 'app-123',
        sbi: '123456789',
        crn: 'CRN123456',
        data: { some: 'data' },
        created_at: new Date()
      }
    }

    it('should validate valid data', () => {
      const { error } =
        applicationValidationRunResponseSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should require message', () => {
      const data = { ...validData }
      delete data.message
      const { error } = applicationValidationRunResponseSchema.validate(data)
      expect(error.details[0].message).toContain('message')
    })

    it('should allow missing applicationValidationRun', () => {
      const data = { ...validData }
      delete data.applicationValidationRun
      const { error } = applicationValidationRunResponseSchema.validate(data)
      expect(error).toBeUndefined()
    })

    it('should validate applicationValidationRun structure', () => {
      const data = {
        message: 'Validation completed',
        applicationValidationRun: {
          id: 'not-a-number',
          application_id: 'app-123',
          sbi: '123456789',
          crn: 'CRN123456',
          data: { some: 'data' },
          created_at: new Date()
        }
      }
      const { error } = applicationValidationRunResponseSchema.validate(data)
      expect(error.details[0].message).toContain('id')
    })
  })

  describe('applicationValidationResponseSchema', () => {
    const validData = {
      message: 'Validation completed',
      id: 123,
      errorMessages: [
        {
          code: 'ERROR1',
          description: 'Error description',
          sheetId: 'sheet-1',
          parcelId: 'parcel-1',
          passed: false
        }
      ],
      valid: true
    }

    it('should validate valid data', () => {
      const { error } = applicationValidationResponseSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should validate data without errorMessages', () => {
      const data = {
        message: 'Validation completed',
        id: 123,
        valid: true
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error).toBeUndefined()
    })

    it('should require message', () => {
      const data = { ...validData }
      delete data.message
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('message')
    })

    it('should require id as integer', () => {
      const data = { ...validData, id: 'not-a-number' }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('id')
    })

    it('should require valid boolean', () => {
      const data = { ...validData, valid: 'not-a-boolean' }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('valid')
    })

    it('should validate errorMessages structure', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            description: 'Error description',
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            passed: 'not-a-boolean'
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('passed')
    })

    it('should require errorMessage code', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            description: 'Error description',
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            passed: false
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('code')
    })

    it('should require errorMessage description', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            passed: false
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('description')
    })

    it('should require errorMessage sheetId', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            description: 'Error description',
            parcelId: 'parcel-1',
            passed: false
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('sheetId')
    })

    it('should require errorMessage parcelId', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            description: 'Error description',
            sheetId: 'sheet-1',
            passed: false
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('parcelId')
    })

    it('should require errorMessage passed boolean', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            description: 'Error description',
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            passed: 'not-a-boolean'
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error.details[0].message).toContain('passed')
    })

    it('should accept multiple errorMessages', () => {
      const data = {
        ...validData,
        errorMessages: [
          {
            code: 'ERROR1',
            description: 'Error description 1',
            sheetId: 'sheet-1',
            parcelId: 'parcel-1',
            passed: false
          },
          {
            code: 'ERROR2',
            description: 'Error description 2',
            sheetId: 'sheet-2',
            parcelId: 'parcel-2',
            passed: true
          }
        ]
      }
      const { error } = applicationValidationResponseSchema.validate(data)
      expect(error).toBeUndefined()
    })
  })

  describe('applicationValidationRunsBodyRequestSchema', () => {
    const validData = {
      fields: ['details']
    }

    it('should validate valid data', () => {
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should require fields array', () => {
      const data = {}
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error.details[0].message).toContain('fields')
    })

    it('should require fields to be an array', () => {
      const data = { fields: 'not-an-array' }
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error.details[0].message).toContain('fields')
    })

    it('should require fields array to contain only valid values', () => {
      const data = { fields: ['invalid-value'] }
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error.details[0].message).toContain('must be [details]')
    })

    it('should accept multiple valid field values', () => {
      const data = { fields: ['details', 'details'] }
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error).toBeUndefined()
    })

    it('should accept empty fields array', () => {
      const data = { fields: [] }
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error).toBeUndefined()
    })

    it('should reject mixed valid and invalid values', () => {
      const data = { fields: ['details', 'invalid-value'] }
      const { error } =
        applicationValidationRunsBodyRequestSchema.validate(data)
      expect(error.details[0].message).toContain('must be [details]')
    })
  })
})
