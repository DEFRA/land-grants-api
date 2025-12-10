import { statisticsSuccessResponseSchema } from './statistics.schema.js'

describe('statisticsSuccessResponseSchema', () => {
  const validData = {
    message: 'Statistics retrieved'
  }

  it('should validate valid data', () => {
    const { error } = statisticsSuccessResponseSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should reject missing message', () => {
    const data = {}
    const { error } = statisticsSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('message')
  })

  it('should reject invalid message type', () => {
    const data = {
      message: 123
    }
    const { error } = statisticsSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('string')
  })

  it('should reject empty message', () => {
    const data = {
      message: ''
    }
    const { error } = statisticsSuccessResponseSchema.validate(data)
    expect(error).toBeDefined()
    expect(error.details[0].message).toContain('empty')
  })

  it('should reject null', () => {
    const { error } = statisticsSuccessResponseSchema.validate(null)
    expect(error).toBeDefined()
  })

  it('should reject undefined', () => {
    const { error } = statisticsSuccessResponseSchema.validate(undefined)
    expect(error).toBeDefined()
  })
})
