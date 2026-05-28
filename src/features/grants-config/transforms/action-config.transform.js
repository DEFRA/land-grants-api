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
    semanticVersion: `${major}.${minor}.${patch}`,
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
  if (!semanticVersion) {
    throw new Error('semanticVersion is required')
  }

  const parts = semanticVersion.split('.')
  const major = Number.parseInt(parts[0] || '0', 10)
  const minor = Number.parseInt(parts[1] || '0', 10)
  const patch = Number.parseInt(parts[2] || '0', 10)

  if (
    !Number.isFinite(major) ||
    !Number.isFinite(minor) ||
    !Number.isFinite(patch)
  ) {
    throw new Error(
      `Invalid semanticVersion "${semanticVersion}": all parts must be integers`
    )
  }

  return { major, minor, patch }
}
