/* eslint-disable camelcase */

/**
 * Transform action config
 * @param {object} action - db action config
 * @returns {import("../../action.d.js").Action} The action config
 */
export function actionConfigTransformer(action) {
  const {
    application_unit_of_measurement,
    land_cover_class_codes,
    start_date,
    last_updated,
    duration_years,
    major_version,
    minor_version,
    patch_version,
    version,
    semantic_version,
    group_id,
    group_name,
    display_order,
    payment_method,
    ...actionObj
  } = action
  return {
    ...actionObj,
    applicationUnitOfMeasurement: application_unit_of_measurement,
    durationYears: Number(duration_years),
    landCoverClassCodes: land_cover_class_codes,
    startDate: start_date,
    lastUpdated: last_updated,
    version: Number(version),
    majorVersion: Number(major_version),
    minorVersion: Number(minor_version),
    patchVersion: Number(patch_version),
    semanticVersion: semantic_version,
    groupId: group_id,
    groupName: group_name,
    displayOrder: display_order,
    paymentMethod: payment_method
  }
}
