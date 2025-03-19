/**
 * @typedef {object} CalculateAvailableAreaParams
 * @property {string} applicationFor
 * @property {LandParcel} landParcel
 * @property {{[key:string]: string[]}} actionCompatibilityMatrix
 */

/**
 * Calculates the available area of a land parcel for a specific application action.
 *
 * The function considers existing agreements on the land parcel and their compatibility
 * with the requested application action. It subtracts areas of incompatible agreements
 * from the total area of the land parcel.
 * @param  {CalculateAvailableAreaParams} params - The parameters for the calculation.
 * @returns {number} - The available area for the requested application action.
 */
export function calculateAvailableArea(params) {
  if (!params) {
    return 0.0
  }

  const { applicationFor, landParcel, actionCompatibilityMatrix } = params

  // Initialize the available area with the total area of the land parcel.
  let area = landParcel.area ?? 0.0

  const compatibleAgreementGroups = groupCompatibleActions(
    landParcel,
    actionCompatibilityMatrix
  )

  area = subtractIncompatibleActionAreas(
    compatibleAgreementGroups,
    actionCompatibilityMatrix,
    applicationFor,
    area
  )

  // Return the remaining available area.
  return area
}

/**
 * @param  {LandParcel} landParcel
 * @param  {{[key:string]: string[]}} actionCompatibilityMatrix
 * @returns {Array<{area: number, codes: string[]}>}
 */
function groupCompatibleActions(landParcel, actionCompatibilityMatrix) {
  const compatibleAgreementGroups = []

  for (const agreement of landParcel.existingAgreements ?? []) {
    // If there are no groups yet, create the first group with the current agreement.
    if (compatibleAgreementGroups.length === 0) {
      const group = { area: agreement.area, codes: [agreement.code] }
      compatibleAgreementGroups.push(group)
      continue
    }

    // Find a group that is compatible with the current agreement.
    const compatibleGroup = compatibleAgreementGroups.find((group) =>
      isCompatibleWithAllCodes(
        actionCompatibilityMatrix,
        agreement.code,
        group.codes
      )
    )

    if (compatibleGroup) {
      // If the agreement's area matches the group's area, add its code to the group.
      if (agreement.area === compatibleGroup.area) {
        compatibleGroup.codes.push(agreement.code)
      }

      // If the agreement's area is smaller, create a new group the size of the agreement's area and subtract it from the current group.
      else if (agreement.area < compatibleGroup.area) {
        compatibleGroup.area -= agreement.area
        compatibleAgreementGroups.push({
          area: agreement.area,
          codes: [...compatibleGroup.codes, agreement.code]
        })
      }

      // If the agreement's area is larger, add the agreement to the group and create a new group for the remaining area.
      else if (agreement.area > compatibleGroup.area) {
        compatibleGroup.codes.push(agreement.code)
        compatibleAgreementGroups.push({
          area: agreement.area - compatibleGroup.area,
          codes: [agreement.code]
        })
      }
    } else {
      // If no compatible group is found, create a new group for the current agreement.
      compatibleAgreementGroups.push({
        area: agreement.area,
        codes: [agreement.code]
      })
    }
  }
  return compatibleAgreementGroups
}

/**
 * @param  {Array<{area: number, codes: string[]}>} compatibleAgreementGroups
 * @param  {{[key:string]: string[]}} actionCompatibilityMatrix
 * @param  {string} applicationFor
 * @param  {number} area
 * @returns {number}
 */
function subtractIncompatibleActionAreas(
  compatibleAgreementGroups,
  actionCompatibilityMatrix,
  applicationFor,
  area
) {
  for (const group of compatibleAgreementGroups ?? []) {
    if (
      !isCompatibleWithAllCodes(
        actionCompatibilityMatrix,
        applicationFor,
        group.codes
      )
    ) {
      area -= group.area
    }
  }

  return area
}

/**
 * @param  {{[key:string]: string[]}} actionCompatibilityMatrix
 * @param  {string} newCode
 * @param  {string[]} existingCodes
 * @returns {boolean}
 */
function isCompatibleWithAllCodes(
  actionCompatibilityMatrix,
  newCode,
  existingCodes
) {
  const compatibleCodes = existingCodes.filter((code) =>
    actionCompatibilityMatrix[code].includes(newCode)
  )
  return compatibleCodes.length === existingCodes.length
}

/** @import { LandParcel, Application, LayerId } from '../../../rules-engine/rulesEngine.d.js' */
