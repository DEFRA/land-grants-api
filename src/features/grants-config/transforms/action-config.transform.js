/**
 * Transform an action config JSON (camelCase from land-grants-config repo)
 * into the shape stored in the actions_config DB table.
 * @param {object} actionJson - Raw action JSON from S3
 * @returns {{ code: string, semanticVersion: string, major: number, minor: number, patch: number, displayOrder: number, config: object }}
 */
export function transformActionConfig(actionJson) {
  const { major, minor, patch } = parseSemanticVersion(
    actionJson.semanticVersion
  )

  const config = {
    start_date: actionJson.startDate,
    application_unit_of_measurement: actionJson.applicationUnitOfMeasurement,
    duration_years: actionJson.durationYears,
    payment: actionJson.payment,
    payment_method: actionJson.paymentMethod,
    land_cover_class_codes: actionJson.landCoverClassCodes ?? [],
    rules: actionJson.rules ?? []
  }

  return {
    code: actionJson.code,
    semanticVersion: actionJson.semanticVersion,
    major,
    minor,
    patch,
    displayOrder: actionJson.displayOrder ?? 0,
    config
  }
}

/**
 * @param {string} semanticVersion - e.g. "1.0.0"
 * @returns {{ major: number, minor: number, patch: number }}
 */
function parseSemanticVersion(semanticVersion) {
  const parts = (semanticVersion ?? '').split('.')
  return {
    major: Number.parseInt(parts[0] || '1', 10),
    minor: Number.parseInt(parts[1] || '0', 10),
    patch: Number.parseInt(parts[2] || '0', 10)
  }
}
