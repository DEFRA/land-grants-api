export const appliedForTotalAvailableArea = {
  execute: (application, rule) => {
    const {
      areaAppliedFor,
      landParcel: { area }
    } = application

    const name = rule.name
    const explanations = [
      {
        title: 'Total valid land cover',
        lines: [
          `Applied for: ${parseFloat(areaAppliedFor)} ha`,
          `Parcel area: ${parseFloat(area)} ha`
        ]
      }
    ]

    if (parseFloat(areaAppliedFor) !== parseFloat(area)) {
      return {
        name,
        passed: false,
        reason: `There is not sufficient available area (${parseFloat(area)} ha) for the applied figure (${parseFloat(areaAppliedFor)} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      reason: `There is sufficient available area (${parseFloat(area)} ha) for the applied figure (${parseFloat(areaAppliedFor)} ha)`,
      explanations
    }
  }
}
