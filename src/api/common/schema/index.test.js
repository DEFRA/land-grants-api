import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from './index.js'

describe('Error Response Schema', () => {
  it('should validate a correct error response', () => {
    const validError = {
      statusCode: 404,
      error: 'Not Found',
      message: 'Resource not found'
    }
    const { error } = errorResponseSchema.validate(validError)
    expect(error).toBeUndefined()
  })

  it('should reject an error response with wrong status code', () => {
    const invalidError = {
      statusCode: 400,
      error: 'Not Found',
      message: 'Resource not found'
    }
    const { error } = errorResponseSchema.validate(invalidError)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('"statusCode" must be [404]')
  })

  it('should reject an error response with missing fields', () => {
    const invalidError = {
      statusCode: 404,
      error: 'Not Found'
    }
    const { error } = errorResponseSchema.validate(invalidError)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('"message" is required')
  })
})

describe('Internal Server Error Response Schema', () => {
  it('should validate a correct internal server error response', () => {
    const validError = {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Something went wrong'
    }
    const { error } = internalServerErrorResponseSchema.validate(validError)
    expect(error).toBeUndefined()
  })

  it('should reject an internal server error response with wrong status code', () => {
    const invalidError = {
      statusCode: 404,
      error: 'Internal Server Error',
      message: 'Something went wrong'
    }
    const { error } = internalServerErrorResponseSchema.validate(invalidError)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('"statusCode" must be [500]')
  })

  it('should reject an internal server error response with missing fields', () => {
    const invalidError = {
      statusCode: 500,
      error: 'Internal Server Error'
    }
    const { error } = internalServerErrorResponseSchema.validate(invalidError)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('"message" is required')
  })
})
