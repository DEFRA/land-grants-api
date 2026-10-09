/**
 * @typedef {object} ApplicationData
 * @property {ActionRequest} action
 * @property {Action[]} actions
 * @property {LandAction} landAction
 * @property {any[] | undefined} agreements
 * @property {Function} compatibilityCheckFn
 * @property {string | undefined} unit
 * @property {number} appliedForQuantity
 */

/**
 * @typedef {object} RequirementContext
 * @property {Pick<ActionRequest, 'code'>} action
 * @property {Action[]} actions
 * @property {Omit<LandAction, 'sbi'>} landAction
 * @property {any[] | undefined} agreements
 * @property {Function} compatibilityCheckFn
 * @property {string | undefined} [unit]
 * @property {number} [appliedForQuantity]
 * @property {object} db
 * @property {object} logger
 */

/**
 * @typedef {object} Explanation
 * @property {string} title
 * @property {string[]} lines
 */

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
