/**
 * @typedef {object} PaymentMethod
 * @property {string} name - The registered payment method name (e.g. 'wmp-calculation')
 * @property {string} [version] - The semantic version of the payment method. Defaults to '1.0.0' when omitted
 * @property {object} [config] - Method-specific configuration passed through to the execute function
 */
