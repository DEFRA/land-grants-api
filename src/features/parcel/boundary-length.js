import { isLengthUnit } from '~/src/features/common/constants/unit_type.js'
import { getLandParcelBoundary } from '~/src/features/parcel/queries/getParcelBoundary.query.js'

/**
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 */

/**
 * The parcel's perimeter, read once and only when something displayed competes
 * for it. Null when nothing does, and null when the geometry could not be read.
 * @param {LandParcelDb} parcel - The parcel
 * @param {Action[]} actions - The actions this parcel will report
 * @param {Pool} postgresDb - The postgres database
 * @param {Logger} logger - The logger
 * @returns {Promise<number|null>} The perimeter in metres
 */
export async function getBoundaryLengthMeters(
  parcel,
  actions,
  postgresDb,
  logger
) {
  const hasLinearAction = actions.some((action) =>
    isLengthUnit(action.applicationUnitOfMeasurement)
  )

  if (!hasLinearAction) {
    return null
  }

  const boundary = await getLandParcelBoundary(
    parcel.sheet_id,
    parcel.parcel_id,
    postgresDb,
    logger
  )

  return boundary?.boundaryLengthMeters ?? null
}
