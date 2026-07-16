import { describe, it, expect } from 'vitest'
import { sumTotalLandAreaSqm } from './wmp-payment-calculate.service.js'

const createMockParcels = () => [{ area: 10 }, { area: 20 }, { area: 30 }]

describe('sumTotalLandAreaSqm', () => {
  it('should return the sum of all parcel areas', () => {
    expect(sumTotalLandAreaSqm(createMockParcels())).toBe(60)
  })

  it('should return 0 for an empty parcel array', () => {
    expect(sumTotalLandAreaSqm([])).toBe(0)
  })

  it('should skip null parcels and sum the rest', () => {
    expect(sumTotalLandAreaSqm([{ area: 10 }, null, { area: 20 }])).toBe(30)
  })

  it('should return 0 when all parcels are null', () => {
    expect(sumTotalLandAreaSqm([null, null])).toBe(0)
  })
})
