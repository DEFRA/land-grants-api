import {
  parcelTilesParamsSchema,
  parcelTilesPayloadSchema
} from './parcelTiles.schema.js'

describe('parcelTilesParamsSchema', () => {
  it('accepts valid tile coordinates', () => {
    const result = parcelTilesParamsSchema.validate({ z: 14, x: 8084, y: 5258 })
    expect(result.error).toBeUndefined()
  })

  it('accepts zoom 0 origin', () => {
    const result = parcelTilesParamsSchema.validate({ z: 0, x: 0, y: 0 })
    expect(result.error).toBeUndefined()
  })

  it('rejects negative coordinates', () => {
    const result = parcelTilesParamsSchema.validate({ z: 1, x: -1, y: 0 })
    expect(result.error).toBeDefined()
  })

  it('rejects zoom above max', () => {
    const result = parcelTilesParamsSchema.validate({ z: 23, x: 0, y: 0 })
    expect(result.error).toBeDefined()
  })

  it('rejects x out of range for the zoom level', () => {
    const result = parcelTilesParamsSchema.validate({ z: 2, x: 4, y: 0 })
    expect(result.error).toBeDefined()
  })

  it('rejects y out of range for the zoom level', () => {
    const result = parcelTilesParamsSchema.validate({ z: 2, x: 0, y: 4 })
    expect(result.error).toBeDefined()
  })

  it('rejects non-integer values', () => {
    const result = parcelTilesParamsSchema.validate({ z: 1.5, x: 0, y: 0 })
    expect(result.error).toBeDefined()
  })
})

describe('parcelTilesPayloadSchema', () => {
  it('accepts an array of well-formed ids', () => {
    const result = parcelTilesPayloadSchema.validate({
      parcelIds: ['SD7547-4115', 'AB1234-9']
    })
    expect(result.error).toBeUndefined()
  })

  it('rejects ids missing the dash separator', () => {
    const result = parcelTilesPayloadSchema.validate({
      parcelIds: ['SD75474115']
    })
    expect(result.error).toBeDefined()
  })

  it('rejects ids with a non-numeric parcel segment', () => {
    const result = parcelTilesPayloadSchema.validate({
      parcelIds: ['SD7547-abcd']
    })
    expect(result.error).toBeDefined()
  })

  it('rejects an empty array', () => {
    const result = parcelTilesPayloadSchema.validate({ parcelIds: [] })
    expect(result.error).toBeDefined()
  })

  it('rejects more than 1000 ids', () => {
    const parcelIds = Array.from({ length: 1001 }, (_, i) => `SHEET-${i + 1}`)
    const result = parcelTilesPayloadSchema.validate({ parcelIds })
    expect(result.error).toBeDefined()
  })

  it('rejects a missing parcelIds field', () => {
    const result = parcelTilesPayloadSchema.validate({})
    expect(result.error).toBeDefined()
  })
})
