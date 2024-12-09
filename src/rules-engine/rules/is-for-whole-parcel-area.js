export function isForWholeParcelArea(application) {
  const {
    areaAppliedFor,
    landParcel: { area }
  } = application

  if (parseFloat(areaAppliedFor) !== parseFloat(area)) {
    return {
      passed: false,
      message: `Area applied for (${areaAppliedFor}ha) does not match parcel area (${area}ha)`
    }
  }

  return { passed: true }
}
