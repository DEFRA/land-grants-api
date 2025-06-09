/**
 * Transform the application data
 * @param {string} actionCodeAppliedFor - The code of the action
 * @param {number} area - The area of the parcel
 * @param {number} areaAppliedFor - The area applied for
 * @param {number} intersectingAreaPercentage - The intersecting area percentage
 * @param {Array} existingAgreements - The existing agreements
 */
function applicationTransformer(
  actionCodeAppliedFor,
  area,
  areaAppliedFor,
  intersectingAreaPercentage,
  existingAgreements
) {
  return {
    areaAppliedFor,
    actionCodeAppliedFor,
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
