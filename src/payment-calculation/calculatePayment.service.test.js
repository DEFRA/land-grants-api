// import { mockLandActions } from '~/src/api/actions/fixtures/index.js'
// import { calculatePayment } from '~/src/api/payment/service/payment.service.js'

// describe.skip('calculatePayment', () => {
//   const mockLogger = {
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn()
//   }

//   beforeEach(() => {
//     jest.clearAllMocks()
//   })

//   it('calculatePayment should return null if invalid payload is provided', () => {
//     const result = calculatePayment([{ sheetId: '' }], mockLogger)

//     expect(result).toBeNull()
//   })

//   it('should return calculated payments for given valid land actions', () => {
//     const expectedPayment = {
//       payment: {
//         total: 100.98
//       }
//     }

//     const result = calculatePayment(mockLandActions, mockLogger)

//     expect(result).toEqual(expectedPayment)
//   })
// })
