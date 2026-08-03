/**
 * Transform action config
 * @param {object} action - db action config
 * @returns {import("../../action.d.js").Action} The action config
 */
export function actionConfigTransformer(action) {
  const {
    application_unit_of_measurement: applicationUnitOfMeasurement,
    land_cover_class_codes: landCoverClassCodes,
    start_date: startDate,
    last_updated: lastUpdated,
    duration_years: durationYears,
    version,
    semantic_version: semanticVersion,
    ...actionObj
  } = action
  return {
    ...actionObj,
    applicationUnitOfMeasurement,
    durationYears: Number(durationYears),
    landCoverClassCodes,
    startDate,
    lastUpdated,
    version: Number(version),
    semanticVersion
  }
}
