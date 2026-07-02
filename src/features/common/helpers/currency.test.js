import { describe, it, expect } from 'vitest'
import { gbpToPence } from './currency.js'

describe('gbpToPence', () => {
  it('should convert pounds into pence', () => {
    expect(gbpToPence(20)).toBe(2000)
  })

  it('should round to the nearest integer pence', () => {
    expect(gbpToPence(10.001)).toBe(1000)
    expect(gbpToPence(10.007)).toBe(1001)
  })

  it('should handle undefined with default parameter', () => {
    expect(gbpToPence()).toBe(0)
    expect(gbpToPence(undefined)).toBe(0)
  })
})
