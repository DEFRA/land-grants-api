import {
  calculateActionPayment,
  calculatePaymentAmounts
} from './paymentCalculation.old.js'

describe('calculatePaymentAmounts', () => {
  test('returns even split', () => {
    const res = calculatePaymentAmounts(96, { years: 3, frequencyInMonths: 3 })

    expect(res).toEqual([8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8])
  })

  test('amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(101, { years: 3, frequencyInMonths: 3 })

    expect(res).toEqual([13, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8])
  })

  test('large amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(27203, {
      years: 3,
      frequencyInMonths: 3
    })

    expect(res).toEqual([
      2277, 2266, 2266, 2266, 2266, 2266, 2266, 2266, 2266, 2266, 2266, 2266
    ])
  })
})

describe('calculateActionPayment', () => {
  test('CMOR1', () => {
    const res = calculateActionPayment({ code: 'CMOR1', quantity: 10 })
    expect(res).toEqual(37800)
  })

  test('UPL1', () => {
    const res = calculateActionPayment({ code: 'UPL1', quantity: 7.3 })
    expect(res).toEqual(14600)
  })
})
