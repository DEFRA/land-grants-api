/**
 * validates land actions data and return isValidationSucess flag
 * @returns {object} isValidationSucess boolean flag
 * @param {object} landActions - The parcel to fetch
 * @param {object} logger - Logger instance
 */
function validateLandActions(landActions, logger) {
  logger.info(
    `Validating land actions, landActions: ${JSON.stringify(landActions)}`
  )
  const errorMessages =
    landActions.length > 0 &&
    landActions[0].actions.length > 0 &&
    landActions[0].actions.reduce((errors, item) => {
      if (item.quantity > 100) {
        errors.push({
          code: item.code,
          description: `${item.code} is exceeding max limit 100`
        })
      }
      return errors
    }, [])

  return {
    errorMessages,
    valid: errorMessages.length === 0
  }
}

export { validateLandActions }
