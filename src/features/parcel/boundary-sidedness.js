import { isLengthUnit } from '~/src/features/common/constants/unit_type.js'
import { getSidednessByActionCode } from '~/src/features/actions/queries/getSidednessByActionCode.query.js'

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {ActionWithLength, SidednessByActionCode} from '~/src/features/available-length/available-length.d.js'
 */

/**
 * The sidedness of every linear action on the parcel's boundary, read only
 * when there is a readable boundary for a displayed linear action to use.
 * @param {number|null} boundaryLengthMeters - The parcel's perimeter, null when not needed or not readable
 * @param {Action[]} displayedActions - The actions this parcel will report
 * @param {ActionWithLength[]} existingLinearActions - The agreements and planned actions already competing for the boundary
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<SidednessByActionCode>} The sidedness by action code
 */
export function getSidednessForActions(
  boundaryLengthMeters,
  displayedActions,
  existingLinearActions,
  postgresDb,
  logger
) {
  if (boundaryLengthMeters === null) {
    return Promise.resolve({})
  }

  const displayedLinearActions = displayedActions.filter((action) =>
    isLengthUnit(action.applicationUnitOfMeasurement)
  )

  const linearActionCodes = new Set([
    ...displayedLinearActions.map(({ code }) => code),
    ...existingLinearActions.map(({ actionCode }) => actionCode)
  ])

  return getSidednessByActionCode([...linearActionCodes], postgresDb, logger)
}
