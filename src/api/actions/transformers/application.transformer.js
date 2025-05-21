/**
 * Transform the application data
 * @param {number} areaAppliedFor - The area applied for
 * @param {string} code - The code of the action
 * @param {number} area - The area of the parcel
 * @param {number} intersectingAreaPercentage - The intersecting area percentage
 * @param {Array} existingAgreements - The existing agreements
 */
function applicationTransformer(
  areaAppliedFor,
  code,
  area,
  intersectingAreaPercentage,
  existingAgreements
) {
  return {
    areaAppliedFor,
    actionCodeAppliedFor: code,
    landParcel: {
      area,
      existingAgreements,
      intersections: {
        moorland: { intersectingAreaPercentage }
      }
    }
  }
}

export { applicationTransformer }
