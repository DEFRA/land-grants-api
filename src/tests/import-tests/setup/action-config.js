/**
 * A complete action config that passes the action config schema, as the grants config repo publishes it
 * @param {string} code - The action code
 * @param {object} [overrides] - Fields to replace
 * @returns {object}
 */
export const actionConfigFor = (code, overrides = {}) => ({
  code,
  semanticVersion: '1.0.0',
  description: `${code} test action`,
  applicationUnitOfMeasurement: 'ha',
  display: true,
  displayOrder: 0,
  durationYears: 3,
  enabled: true,
  groupId: null,
  startDate: '2025-01-01',
  payment: { ratePerUnitGbp: 10 },
  paymentMethod: { name: 'per-unit' },
  rules: [],
  ...overrides
})
