export const check = (application, ruleConfig) => {
  const {
    landParcel: { area }
  } = application

  const passed = area < ruleConfig.maxArea

  return !passed
    ? {
        passed,
        message: `The parcel must have a maximum total area of ${ruleConfig.maxArea}ha`
      }
    : { passed }
}

/**
 * @type {import('../rulesEngine.d.js').Rule}
 */
export const isLessThanMaximumParcelArea = { check, requiredDataLayers: [] }
