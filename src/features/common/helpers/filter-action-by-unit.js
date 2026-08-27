/**
 * @param {Action[]} actions
 * @param {string} unit
 * @returns {(a: LandActionEntry) => boolean}
 */
export function createFilterActionByUnit(actions, unit) {
  /**
   * @param {LandActionEntry} a
   */
  return (a) => {
    const actionUnit = actions.find(
      (config) => config.code === a.code
    )?.applicationUnitOfMeasurement
    return actionUnit === undefined || actionUnit === unit
  }
}

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { LandActionEntry } from '~/src/features/payment/payment.d.js'
 */
