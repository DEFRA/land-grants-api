export function check(application, config) {
  const {
    areaAppliedFor,
    actionCodeAppliedFor,
    landParcel: { existingAgreements, area }
  } = application

  const incompatibleAction = existingAgreements.find(
    (/** @type {{ code: string; }} */ agreement) =>
      config.incompatibleAction === agreement.code
  )

  if (incompatibleAction) {
    const totalArea = areaAppliedFor + incompatibleAction.area

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
  }

  return { passed: true }
}

/**
 * @type {import('../../types.js').Rule}
 */
export const totalAreaWithException = { check, requiredDataLayers: [] }
