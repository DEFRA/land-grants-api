import { paymentMethods } from './payment-methods/index.js'

export const executePaymentMethod = (paymentMethod, data) => {
  const version = paymentMethod.version ?? '1.0.0'
  const paymentMethodKey = `${paymentMethod.name}-${version}`
  const result = paymentMethods[paymentMethodKey]
    ? paymentMethods[paymentMethodKey].execute(paymentMethod, data)
    : {
        name: paymentMethod.name,
        scheduledPayments: {},
        message: 'Payment method not found'
      }

  return result
}
