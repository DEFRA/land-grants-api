import { mockLandData, mockSqlLandData } from '../fixtures/index.js'
import { landDataTransformer } from './land.transformer.js'

describe('landDataTransformer', () => {
  it('should transform sql row land data to model', () => {
    const result = landDataTransformer([mockSqlLandData])

    expect(result).toEqual([mockLandData])
  })
})
