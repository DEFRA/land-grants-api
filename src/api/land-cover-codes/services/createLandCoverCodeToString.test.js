import { createLandCoverCodeToString } from './createLandCoverCodeToString.js'

const landCoverDefinitions = [
  {
    landCoverCode: '1331',
    landCoverClassCode: '1330',
    landCoverTypeCode: 'TYPE1',
    landCoverTypeDescription: 'Commercial',
    landCoverClassDescription: 'Pub',
    landCoverDescription: 'Beer Garden'
  },
  {
    landCoverCode: '5551',
    landCoverClassCode: '5550',
    landCoverTypeCode: 'TYPE1',
    landCoverTypeDescription: 'Industrial',
    landCoverClassDescription: 'Factory',
    landCoverDescription: 'Jam Factory'
  }
]

describe('createLandCoverLookup', () => {
  it('should return a string representation of land cover', () => {
    const codeToString = createLandCoverCodeToString(landCoverDefinitions)

    expect(codeToString('1331')).toBe('Beer Garden (1331)')
    expect(codeToString('5551')).toBe('Jam Factory (5551)')
  })

  it('should return a string representation of land cover class with a warning', () => {
    const codeToString = createLandCoverCodeToString(landCoverDefinitions)

    expect(codeToString('1330')).toBe(
      'Pub (1330) Warning: This is a land cover class'
    )
    expect(codeToString('5550')).toBe(
      'Factory (5550) Warning: This is a land cover class'
    )
  })

  it('should return a string representation of unknown land cover codes', () => {
    const codeToString = createLandCoverCodeToString(landCoverDefinitions)
    expect(codeToString('9999')).toBe('Unknown land cover code: 9999')
  })

  it('should not show warning for land cover class codes when noWarning is set to true', () => {
    const codeToString = createLandCoverCodeToString(landCoverDefinitions)
    expect(codeToString('1330', true)).toBe('Pub (1330)')
    expect(codeToString('5550', true)).toBe('Factory (5550)')
  })
})
