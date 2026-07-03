import { describe, it, expect } from 'vitest'
import { statusIngestQuery } from './status.schema.js'

describe('statusIngestQuery schema validation', () => {
  it('should pass with both ingestId and filename', () => {
    const { error } = statusIngestQuery.validate({
      ingestId: 123,
      filename: 'test.csv'
    })
    expect(error).toBeUndefined()
  })

  it('should pass with only ingestId', () => {
    const { error } = statusIngestQuery.validate({
      ingestId: 123
    })
    expect(error).toBeUndefined()
  })

  it('should pass with neither parameters', () => {
    const { error } = statusIngestQuery.validate({})
    expect(error).toBeUndefined()
  })

  it('should fail with only filename', () => {
    const { error } = statusIngestQuery.validate({
      filename: 'test.csv'
    })
    expect(error).toBeDefined()
    expect(error.details[0].message).toMatch(/missing required peer "ingestId"/)
  })
})
