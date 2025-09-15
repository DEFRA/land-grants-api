export const appliedForTotalAvailableArea = {
  execute: (application, rule) => {
    const {
      areaAppliedFor,
      landParcel: { area }
    } = application

    const name = rule.name

    if (parseFloat(areaAppliedFor) !== parseFloat(area)) {
      return {
        name,
        passed: false,
        reason: `There is not sufficient available area (${areaAppliedFor} ha) for the applied figure (${area} ha)`
      }
    }

    return {
      name,
      passed: true,
      reason: `There is sufficient available area (${areaAppliedFor} ha) for the applied figure (${area} ha)`,
      explanations: [
        {
          title: 'Total valid land cover',
          lines: [area]
        }
      ]
    }
  }
}
