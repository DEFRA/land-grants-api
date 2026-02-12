import { mergeLandCoverCodes } from './merge-land-cover-codes.js'

describe('mergeLandCoverCodes', () => {
  it('should merge land cover codes correctly', () => {
    const landCoverCodes = [
      { landCoverCode: '111', landCoverClassCode: '110' },
      { landCoverCode: '131', landCoverClassCode: '130' },
      { landCoverCode: '118', landCoverClassCode: '110' },
      { landCoverCode: '112', landCoverClassCode: '110' },
      { landCoverCode: '117', landCoverClassCode: '110' }
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
      { landCoverCode: '111', landCoverClassCode: '110' },
      { landCoverCode: '111', landCoverClassCode: '110' }
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
