export function totalAreaWithException(application, config) {
  const {
    areaAppliedFor,
    actionCodeAppliedFor,
    landParcel: { existingAgreements, area }
  } = application

  const incompatibleAction =
    existingAgreements.find(
      (/** @type {{ code: string; }} */ agreement) =>
        config.incompatibleAction === agreement.code
    ) ||
    application.userSelectedActions?.some(
      (action) => config.incompatibleAction === action.actionCode
    )

  if (incompatibleAction) {
    const totalArea =
      parseFloat(areaAppliedFor) + parseFloat(incompatibleAction.area)

    if (totalArea > area) {
      return {
        passed: false,
        message: `Action code ${actionCodeAppliedFor} is using a larger area than is available after existing agreement ${config.incompatibleAction} is applied`
      }
    }

    if (totalArea < area) {
      return {
        passed: false,
        message: `Action code ${actionCodeAppliedFor} is using a smaller area than is available after existing agreement ${config.incompatibleAction} is applied`
      }
    }
  } else {
    if (parseFloat(areaAppliedFor) < parseFloat(area))
      return {
        passed: false,
        message: `Action code ${actionCodeAppliedFor} can only use less than the parcel size if existing agreement ${config.incompatibleAction} is applied`
      }
  }

  return { passed: true }
}
