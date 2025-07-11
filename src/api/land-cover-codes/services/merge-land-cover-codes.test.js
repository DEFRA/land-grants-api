import { mergeLandCoverCodes } from './merge-land-cover-codes.js'

describe('mergeLandCoverCodes', () => {
  it('should merge land cover codes correctly', () => {
    const landCoverCodes = [
      { land_cover_code: '111', land_cover_class_code: '110' },
      { land_cover_code: '131', land_cover_class_code: '130' },
      { land_cover_code: '118', land_cover_class_code: '110' },
      { land_cover_code: '112', land_cover_class_code: '110' },
      { land_cover_code: '117', land_cover_class_code: '110' }
    ]

    const expectedMerged = ['110', '111', '112', '117', '118', '130', '131']

    const result = mergeLandCoverCodes(landCoverCodes)
    expect(result).toEqual(expectedMerged)
  })

  it('should return an empty array if no land cover codes are provided', () => {
    const result = mergeLandCoverCodes([])
    expect(result).toEqual([])
  })

  it('should handle duplicate land cover codes', () => {
    const landCoverCodes = [
      { land_cover_code: '111', land_cover_class_code: '110' },
      { land_cover_code: '111', land_cover_class_code: '110' }
    ]
    const expectedMerged = ['110', '111']

    const result = mergeLandCoverCodes(landCoverCodes)
    expect(result).toEqual(expectedMerged)
  })

  it('should throw an error for undefined land cover codes', () => {
    // @ts-expect-error passing unexpected type to test error handling
    expect(() => mergeLandCoverCodes(undefined)).toThrow(
      'No land cover codes passed to mergeLandCoverCodes function'
    )
  })
})
