/**
 * Checks that a land parcel is is not a SSSI
 * @param {Application} application
 * @returns {RuleResponse}
 */
export const isNotSSSI = (application) => {
  const intersection = application.landParcel.intersections?.sssi
  const passed = intersection ? intersection <= 0 : false

  if (!passed) {
    return {
      passed,
      message: 'Land parcel is a SSSI'
    }
  }

  return {
    passed
  }
}
