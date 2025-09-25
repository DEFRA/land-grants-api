import {
  applicationValidationSchema,
  applicationValidationRunSchema,
  applicationValidationRunRequestSchema,
  applicationValidationRunsRequestSchema,
  applicationValidationRunResponseSchema,
  applicationValidationRunsResponseSchema
} from './application-validation.schema.js'

describe('Application Validation Schemas', () => {
  describe('applicationValidationSchema', () => {
    const validData = {
      applicationId: '123',
      requester: 'grants-ui',
      applicantCrn: '345',
      landActions: [
        {
          sheetId: 'SX0679',
          parcelId: '9238',
          sbi: 123456789,
          actions: [
            {
              code: 'BND1',
              quantity: 99.0
            }
          ]
        }
      ]
    }

    test('should validate valid application validation data', () => {
      const { error, value } = applicationValidationSchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    test('should require applicationId', () => {
      const invalidData = { ...validData }
      delete invalidData.applicationId

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('applicationId')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require requester', () => {
      const invalidData = { ...validData }
      delete invalidData.requester

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('requester')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require applicantCrn', () => {
      const invalidData = { ...validData }
      delete invalidData.applicantCrn

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('applicantCrn')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require landActions array', () => {
      const invalidData = { ...validData }
      delete invalidData.landActions

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('landActions')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should validate landActions structure', () => {
      const invalidData = {
        ...validData,
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: 123456789,
            actions: [
              {
                code: 'BND1'
                // missing quantity
              }
            ]
          }
        ]
      }

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('quantity')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should validate sbi as integer', () => {
      const invalidData = {
        ...validData,
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: 'not-a-number',
            actions: [
              {
                code: 'BND1',
                quantity: 99.0
              }
            ]
          }
        ]
      }

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('sbi')
      expect(error.details[0].type).toBe('number.base')
    })

    test('should validate quantity as number', () => {
      const invalidData = {
        ...validData,
        landActions: [
          {
            sheetId: 'SX0679',
            parcelId: '9238',
            sbi: 123456789,
            actions: [
              {
                code: 'BND1',
                quantity: 'not-a-number'
              }
            ]
          }
        ]
      }

      const { error } = applicationValidationSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('quantity')
      expect(error.details[0].type).toBe('number.base')
    })
  })

  describe('applicationValidationRunSchema', () => {
    const validData = {
      id: 123,
      application_id: '12345',
      sbi: '214314',
      crn: '1937195628',
      data: {
        some: 'data'
      },
      created_at: new Date()
    }

    test('should validate valid application validation run data', () => {
      const { error, value } =
        applicationValidationRunSchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    test('should require id', () => {
      const invalidData = { ...validData }
      delete invalidData.id

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('id')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require application_id', () => {
      const invalidData = { ...validData }
      delete invalidData.application_id

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('application_id')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require sbi', () => {
      const invalidData = { ...validData }
      delete invalidData.sbi

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('sbi')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require crn', () => {
      const invalidData = { ...validData }
      delete invalidData.crn

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('crn')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require data', () => {
      const invalidData = { ...validData }
      delete invalidData.data

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('data')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should require created_at', () => {
      const invalidData = { ...validData }
      delete invalidData.created_at

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('created_at')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should validate id as integer', () => {
      const invalidData = {
        ...validData,
        id: 'not-a-number'
      }

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('id')
      expect(error.details[0].type).toBe('number.base')
    })

    test('should validate created_at as date', () => {
      const invalidData = {
        ...validData,
        created_at: 'not-a-date'
      }

      const { error } = applicationValidationRunSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('created_at')
      expect(error.details[0].type).toBe('date.base')
    })
  })

  describe('applicationValidationRunRequestSchema', () => {
    const validData = {
      id: 123
    }

    test('should validate valid request data', () => {
      const { error, value } =
        applicationValidationRunRequestSchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    test('should require id', () => {
      const invalidData = {}

      const { error } =
        applicationValidationRunRequestSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('id')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should validate id as integer', () => {
      const invalidData = {
        id: 'not-a-number'
      }

      const { error } =
        applicationValidationRunRequestSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('id')
      expect(error.details[0].type).toBe('number.base')
    })
  })

  describe('applicationValidationRunsRequestSchema', () => {
    const validData = {
      applicationId: '12345'
    }

    test('should validate valid request data', () => {
      const { error, value } =
        applicationValidationRunsRequestSchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    test('should require applicationId', () => {
      const invalidData = {}

      const { error } =
        applicationValidationRunsRequestSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('applicationId')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should validate applicationId as string', () => {
      const invalidData = {
        applicationId: 123
      }

      const { error } =
        applicationValidationRunsRequestSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('applicationId')
      expect(error.details[0].type).toBe('string.base')
    })
  })

  describe('applicationValidationRunResponseSchema', () => {
    const validData = {
      message: 'Application validation run retrieved successfully',
      applicationValidationRun: {
        id: 123,
        application_id: '12345',
        sbi: '214314',
        crn: '1937195628',
        data: {
          some: 'data'
        },
        created_at: new Date()
      }
    }

    test('should validate valid response data', () => {
      const { error, value } =
        applicationValidationRunResponseSchema.validate(validData)
      expect(error).toBeUndefined()
      expect(value).toEqual(validData)
    })

    test('should require message', () => {
      const invalidData = { ...validData }
      delete invalidData.message

      const { error } =
        applicationValidationRunResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('message')
      expect(error.details[0].type).toBe('any.required')
    })

    test('should allow missing applicationValidationRun', () => {
      const invalidData = { ...validData }
      delete invalidData.applicationValidationRun

      const { error } =
        applicationValidationRunResponseSchema.validate(invalidData)
      expect(error).toBeUndefined()
    })

    test('should validate applicationValidationRun structure', () => {
      const invalidData = {
        ...validData,
        applicationValidationRun: {
          id: 'not-a-number',
          application_id: '12345',
          sbi: '214314',
          crn: '1937195628',
          data: {
            some: 'data'
          },
          created_at: new Date()
        }
      }

      const { error } =
        applicationValidationRunResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain('id')
      expect(error.details[0].type).toBe('number.base')
    })
  })

  describe('applicationValidationRunsResponseSchema', () => {
    const validDataWithDetailedRuns = {
      message: 'Application validation runs retrieved successfully',
      applicationValidationRuns: [
        {
          id: 123,
          application_id: '12345',
          sbi: '214314',
          crn: '1937195628',
          data: {
            some: 'data'
          },
          created_at: new Date()
        }
      ]
    }

    const validDataWithListRuns = {
      message: 'Application validation runs retrieved successfully',
      applicationValidationRuns: [
        {
          id: 123,
          created_at: new Date()
        }
      ]
    }

    test('should validate valid response data with detailed runs', () => {
      const { error, value } = applicationValidationRunsResponseSchema.validate(
        validDataWithDetailedRuns
      )
      expect(error).toBeUndefined()
      expect(value).toEqual(validDataWithDetailedRuns)
    })

    test('should validate valid response data with list runs', () => {
      const { error, value } = applicationValidationRunsResponseSchema.validate(
        validDataWithListRuns
      )
      expect(error).toBeUndefined()
      expect(value).toEqual(validDataWithListRuns)
    })

    test('should require message', () => {
      const invalidData = { ...validDataWithDetailedRuns }
      delete invalidData.message

      const { error } =
        applicationValidationRunsResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    test('should allow missing applicationValidationRuns', () => {
      const invalidData = { ...validDataWithDetailedRuns }
      delete invalidData.applicationValidationRuns

      const { error } =
        applicationValidationRunsResponseSchema.validate(invalidData)
      expect(error).toBeUndefined()
    })

    test('should validate applicationValidationRuns as array', () => {
      const invalidData = {
        ...validDataWithDetailedRuns,
        applicationValidationRuns: 'not-an-array'
      }

      const { error } =
        applicationValidationRunsResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    test('should validate list run structure', () => {
      const invalidData = {
        ...validDataWithListRuns,
        applicationValidationRuns: [
          {
            id: 'not-a-number',
            date: new Date()
          }
        ]
      }

      const { error } =
        applicationValidationRunsResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })

    test('should validate date in list runs', () => {
      const invalidData = {
        ...validDataWithListRuns,
        applicationValidationRuns: [
          {
            id: 123,
            date: 'not-a-date'
          }
        ]
      }

      const { error } =
        applicationValidationRunsResponseSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error.details[0].message).toContain(
        'does not match any of the allowed types'
      )
    })
  })
})
