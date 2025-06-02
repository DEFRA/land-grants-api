export const parcelHasIntersectionWithDataLayer = {
  execute: (application, rule) => {
    const { layerName, minimumIntersectionPercent, tolerancePercent } =
      rule.config
    const intersection = application.landParcel.intersections?.[layerName]

    if (intersection == null) {
      return {
        passed: false,
        message: `An intersection with the ${layerName} layer was not provided in the application data`
      }
    }

    const isGreaterThanOrEqualToMin =
      intersection.intersectingAreaPercentage >=
      minimumIntersectionPercent - tolerancePercent

    return isGreaterThanOrEqualToMin
      ? { passed: true }
      : {
          passed: false,
          message: `The parcel has a ${intersection.intersectingAreaPercentage}% intersection with the ${layerName} layer, the minimum is ${minimumIntersectionPercent}% with a tolerance of ${tolerancePercent}%`
        }
  }
}
