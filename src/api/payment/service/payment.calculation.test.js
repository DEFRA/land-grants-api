import { calculatePaymentAmounts, calculateActionPayment } from "./payment.calculation.js"

describe('calculatePaymentAmounts', () => {
  test('returns even split', () => {
    const res = calculatePaymentAmounts(100, { totalPayments: 4 })

    expect(res).toEqual([25, 25, 25, 25])
  })

  test('amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(101, { totalPayments: 4 })

    expect(res).toEqual([26, 25, 25, 25])
  })

  test('large amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(27203, { totalPayments: 4 })

    expect(res).toEqual([6803, 6800, 6800, 6800])
  })
})

describe('calculateActionPayment', () => {
  test('CMOR1', () => {
    const res = calculateActionPayment({code:'CMOR1', quantity: 10})
    expect(res).toEqual(37800)
  })

   test('UPL1', () => {
    const res = calculateActionPayment({code:'UPL1', quantity: 7.3})
    expect(res).toEqual(14600)
  })
})