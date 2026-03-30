import { paymentMethods } from './payment-methods/index.js'

/**
 * Looks up and executes a registered payment method by name and version.
 * Falls back to a not-found result object when no matching method is registered.
 * @param {{ name: string, version?: string, config?: object }} paymentMethod - Payment method descriptor containing the name, optional semantic version (defaults to '1.0.0'), and method-specific configuration
 * @param {object} data - Input data forwarded to the payment method's execute function
 * @returns {object} The result produced by the payment method, or a not-found fallback object
 */
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
