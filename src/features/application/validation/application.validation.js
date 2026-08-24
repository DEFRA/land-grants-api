import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { INTEGER_UNITS } from '~/src/features/common/constants/unit_type.js'

/**
 * Validate land actions request
 * @param {object[]} landActions - The land actions
 * @param {object[]} actions - The actions
 * @returns {string | null} The error message
 */
const validateLandActionsRequest = (landActions, actions) => {
  const invalidActions = landActions
    .flatMap((landAction) => landAction.actions.map((action) => action.code))
    .filter((code) => !actions.some((a) => a.code === code))

  if (invalidActions?.length > 0) {
    return `Actions not found: ${invalidActions.join(',')}`
  }

  return null
}

/**
 * Validate that quantity is an integer for actions with integer-only units
 * @param {object[]} landActions - The land actions
 * @param {object[]} actions - The actions
 * @returns {string|null} The error message
 */
const validateQuantities = (landActions, actions) => {
  const invalid = landActions.flatMap((landAction) =>
    landAction.actions.flatMap((action) => {
      const actionConfig = actions.find((a) => a.code === action.code)
      const requiresInt = INTEGER_UNITS.includes(
        actionConfig?.applicationUnitOfMeasurement
      )

      return requiresInt && !Number.isInteger(action.quantity)
        ? [
            `${action.code} (${action.quantity}) on ${landAction.sheetId}-${landAction.parcelId}`
          ]
        : []
    })
  )

  if (invalid.length > 0) {
    return `Quantity must be a whole number for the following actions: ${invalid.join(', ')}`
  }

  return null
}

/**
 * Validate land parcels request
 * @param {object[]} landActions - The land actions
 * @param {object} request - The request
 * @returns {Promise<string | null>} The error message
 */
const validateLandParcelsRequest = async (landActions, request) => {
  const errors = (
    await Promise.all(
      landActions.map(async (landAction) => {
        const parcelResult = await getLandData(
          landAction.sheetId,
          landAction.parcelId,
          request.server.postgresDb,
          request.logger
        )

        return !parcelResult || parcelResult.length === 0
          ? `${landAction.sheetId}-${landAction.parcelId}`
          : null
      })
    )
  ).filter((error) => error !== null)

  return errors && errors.length > 0
    ? `Land parcels not found: ${errors.join(', ')}`
    : null
}

/**
 * Validate request
 * @param {object[]} landActions - The land actions
 * @param {object[]} actions - The actions
 * @param {object} request - The request
 * @returns {Promise<string[] | null>} The error message
 */
export const validateRequest = async (landActions, actions, request) => {
  const errors = []

  // Validate that all land actions have a valid land parcel
  const landParcelsErrors = await validateLandParcelsRequest(
    landActions,
    request
  )

  if (landParcelsErrors) {
    errors.push(landParcelsErrors)
  }

  // Validate that all land actions have a valid action
  const landActionsErrors = validateLandActionsRequest(landActions, actions)

  if (landActionsErrors) {
    errors.push(landActionsErrors)
  }

  // Validate that count action quantities are whole numbers
  const quantityError = validateQuantities(landActions, actions)

  if (quantityError) {
    errors.push(quantityError)
  }

  return errors
}

/**
 * @import { ApplicationValidationError } from '../application.d.js'
 */
