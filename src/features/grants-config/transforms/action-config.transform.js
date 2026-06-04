import { actionConfigInputSchema } from '../schema/action-config.schema.js'

/**
 * Transform an action config JSON (camelCase from land-grants-config repo)
 * into the shape stored in the actions_config DB table.
 * @param {object} actionJson - Raw action JSON from S3
 * @returns {{ code: string, semanticVersion: string, major: number, minor: number, patch: number, displayOrder: number, description: string|null, sssiEligible: boolean, hfEligible: boolean, groupId: number|null, config: object }}
 */
export function transformActionConfig(actionJson) {
  const { error } = actionConfigInputSchema.validate(actionJson)
  if (error) {
    throw new TypeError(
      `Invalid action config: ${error.details.map((d) => d.message).join('; ')}`
    )
  }

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
    description: actionJson.description ?? null,
    sssiEligible: actionJson.sssiEligible ?? true,
    hfEligible: actionJson.hfEligible ?? true,
    groupId: actionJson.groupId ?? null,
    config
  }
}

/**
 * @param {string} semanticVersion - e.g. "1.0.0"
 * @returns {{ major: number, minor: number, patch: number }}
 */
function parseSemanticVersion(semanticVersion) {
  const parts = semanticVersion.split('.')
  const major = Number.parseInt(parts[0] || '0', 10)
  const minor = Number.parseInt(parts[1] || '0', 10)
  const patch = Number.parseInt(parts[2] || '0', 10)

  if (
    !Number.isFinite(major) ||
    !Number.isFinite(minor) ||
    !Number.isFinite(patch)
  ) {
    throw new TypeError(
      `Invalid semanticVersion "${semanticVersion}": all parts must be integers`
    )
  }

  return { major, minor, patch }
}
