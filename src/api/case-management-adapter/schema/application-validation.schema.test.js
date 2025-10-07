import { caseManagementApplicationValidationRunRequestSchema } from './application-validation.schema.js'

describe('applicationValidationRunRequestSchema', () => {
  const validData = {
    id: 123
  }

  it('should validate valid data', () => {
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(validData)
    expect(error).toBeUndefined()
  })

  it('should require id as integer', () => {
    const data = { id: 'not-a-number' }
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(data)
    expect(error.details[0].message).toContain('id')
  })

  it('should require id', () => {
    const data = {}
    const { error } =
      caseManagementApplicationValidationRunRequestSchema.validate(data)
    expect(error.details[0].message).toContain('id')
  })
})
