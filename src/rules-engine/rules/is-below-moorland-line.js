/**
 * Checks that a land parcel is below the moorland line
 * @param {Application} application
 * @returns {RuleResponse}
 */
export const isBelowMoorlandLine = (application) => {
  const intersection = application.landParcel.intersections?.moorland
  const passed = intersection ? intersection > 0 : false

  if (!passed) {
    return {
      passed,
      message: 'Land parcel is above the moorland line'
    }
  }

  return {
    passed
  }
}
