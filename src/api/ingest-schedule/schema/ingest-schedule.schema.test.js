import { ingestScheduleSuccessResponseSchema } from './ingest-schedule.schema.js'

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
})
