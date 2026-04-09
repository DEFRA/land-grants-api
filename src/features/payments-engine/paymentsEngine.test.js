import { executePaymentMethod } from './paymentsEngine.js'
import { paymentMethods } from './payment-methods/index.js'

vi.mock('./payment-methods/index.js', () => ({
  paymentMethods: {}
}))

describe('executePaymentMethod', () => {
  const mockExecute = vi.fn()

  beforeEach(() => {
    paymentMethods['wmp-calculation-1.0.0'] = { execute: mockExecute }
  })

  afterEach(() => {
    delete paymentMethods['wmp-calculation-1.0.0']
    delete paymentMethods['wmp-calculation-2.0.0']
  })

  test('should call execute on the matched payment method and return its result', () => {
    const paymentMethod = { name: 'wmp-calculation' }
    const data = { totalParcelArea: 100 }
    const expectedResult = { payment: 1500 }

    mockExecute.mockReturnValue(expectedResult)

    const result = executePaymentMethod(paymentMethod, data)

    expect(mockExecute).toHaveBeenCalledWith(paymentMethod, data)
    expect(result).toBe(expectedResult)
  })

  test('should default version to 1.0.0 when version is not provided on the payment method', () => {
    const paymentMethod = { name: 'wmp-calculation' }
    const data = {}

    mockExecute.mockReturnValue({})

    executePaymentMethod(paymentMethod, data)

    expect(mockExecute).toHaveBeenCalledTimes(1)
  })

  test('should use the version from the payment method when provided', () => {
    const paymentMethod = { name: 'wmp-calculation', version: '2.0.0' }
    const data = {}

    paymentMethods['wmp-calculation-2.0.0'] = { execute: mockExecute }
    mockExecute.mockReturnValue({})

    executePaymentMethod(paymentMethod, data)

    expect(mockExecute).toHaveBeenCalledWith(paymentMethod, data)
  })

  test('should return a not-found result when the payment method key does not exist', () => {
    const paymentMethod = { name: 'unknown-method' }
    const data = {}

    const result = executePaymentMethod(paymentMethod, data)

    expect(result).toStrictEqual({
      name: 'unknown-method',
      scheduledPayments: {},
      message: 'Payment method not found'
    })
    expect(mockExecute).not.toHaveBeenCalled()
  })
})
