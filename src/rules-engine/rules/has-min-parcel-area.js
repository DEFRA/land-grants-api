export const check = (application, ruleConfig) => {
  const {
    landParcel: { area }
  } = application

  const passed = area >= ruleConfig.minArea

  return !passed
    ? {
        passed,
        message: `The parcel must have a total area of at least ${ruleConfig.minArea}ha`
      }
    : { passed }
}

/**
 * @type {import('../rulesEngine.d.js').Rule}
 */
export const hasMinimumParcelArea = { check, requiredDataLayers: [] }
