/**
 * Checks that a land parcel is a SSSI
 * @param {Application} application
 * @returns {RuleResponse}
 */
export const isSSSI = (application) => {
  const intersection = application.landParcel.intersections?.sssi
  const passed = intersection ? intersection > 0 : false

  if (!passed) {
    return {
      passed,
      message: 'Land parcel is not a SSSI'
    }
  }

  return {
    passed
  }
}
