import { parseParcelIds } from './parcelTiles.service.js'

describe('parseParcelIds', () => {
  it('splits each id on the first dash', () => {
    const result = parseParcelIds(['SD7547-4115', 'AB1234-9'])
    expect(result).toEqual({
      sheetIds: ['SD7547', 'AB1234'],
      parcelKeys: ['4115', '9']
    })
  })

  it('returns empty parallel arrays for empty input', () => {
    expect(parseParcelIds([])).toEqual({ sheetIds: [], parcelKeys: [] })
  })

  it('preserves order across the two arrays', () => {
    const result = parseParcelIds(['A-1', 'B-2', 'C-3'])
    expect(result.sheetIds).toEqual(['A', 'B', 'C'])
    expect(result.parcelKeys).toEqual(['1', '2', '3'])
  })
})
