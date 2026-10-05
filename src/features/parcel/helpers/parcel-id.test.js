import { splitParcelId } from './parcel-id.js'

describe('splitParcelId', () => {
  test('should split valid parcel id into sheetId and parcelId', () => {
    const result = splitParcelId('SX0679-9238')
    expect(result).toEqual({
      sheetId: 'SX0679',
      parcelId: '9238'
    })
  })

  test('should throw error for invalid input', () => {
    expect(() => splitParcelId('SX0679-')).toThrow('Unable to split parcel id')
  })

  test('should throw error for empty input', () => {
    expect(() => splitParcelId(null)).toThrow('Unable to split parcel id')
  })
})
