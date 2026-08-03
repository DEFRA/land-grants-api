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
    major_version: majorVersion,
    minor_version: minorVersion,
    patch_version: patchVersion,
    version,
    semantic_version: semanticVersion,
    group_id: groupId,
    group_name: groupName,
    display_order: displayOrder,
    payment_method: paymentMethod,
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
    majorVersion: Number(majorVersion),
    minorVersion: Number(minorVersion),
    patchVersion: Number(patchVersion),
    semanticVersion,
    groupId,
    groupName,
    displayOrder,
    paymentMethod
  }
}
