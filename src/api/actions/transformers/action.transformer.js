/* eslint-disable camelcase */

/**
 * Get enabled actions
 * @param {object} action - db action
 * @returns {import("../action.d.js").Action} The actions
 */
export function actionTransformer(action) {
  const {
    application_unit_of_measurement,
    land_cover_class_codes,
    start_date,
    last_updated,
    duration_years,
    ...actionObj
  } = action
  return {
    ...actionObj,
    applicationUnitOfMeasurement: application_unit_of_measurement,
    durationYears: Number(duration_years),
    landCoverClassCodes: land_cover_class_codes,
    startDate: start_date,
    lastUpdated: last_updated
  }
}
