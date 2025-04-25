import {
  getParcelArea,
  calculateActionsApplicableArea,
  splitParcelId
} from './parcel.service.js'

describe('Parcel Service', () => {
  const mockLogger = {
    error: jest.fn()
  }

  describe('getParcelArea', () => {
    test('should return 440 for parcelId 9238', () => {
      expect(getParcelArea('9238', mockLogger)).toBe(440)
    })

    test('should return 500 for any other parcelId', () => {
      expect(getParcelArea('1234', mockLogger)).toBe(500)
    })
  })

  describe('calculateActionsApplicableArea', () => {
    test('should return 200', () => {
      expect(calculateActionsApplicableArea()).toBe(200)
    })
  })

  describe('splitParcelId', () => {
    test('should split valid parcel id into sheetId and parcelId', () => {
      const result = splitParcelId('SX0679-9238', mockLogger)
      expect(result).toEqual({
        sheetId: 'SX0679',
        parcelId: '9238'
      })
    })

    test('should throw error for invalid input', () => {
      expect(() => splitParcelId('SX0679-', mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })

    test('should throw error for empty input', () => {
      expect(() => splitParcelId(null, mockLogger)).toThrow(
        'Unable to split parcel id'
      )
    })
  })
})
