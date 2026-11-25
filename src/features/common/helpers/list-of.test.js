import { listOf } from './list-of.js'

describe('listOf', () => {
  test.each([
    [[], 'or', ''],
    [['CLIG3_26'], 'or', 'CLIG3_26'],
    [['CLIG3_26', 'AGF1_26'], 'or', 'CLIG3_26 or AGF1_26'],
    [['CLIG3_26', 'AGF1_26', 'OFM1_26'], 'and', 'CLIG3_26, AGF1_26 and OFM1_26']
  ])('lists %j joined by %s', (codes, conjunction, list) => {
    expect(listOf(codes, conjunction)).toBe(list)
  })
})
