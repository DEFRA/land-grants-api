import compatibilityMatrixModel from '~/src/api/actions/models/compatibilityMatrix.model.js'

async function getCompatibilityMatrix(code, logger) {
  try {
    const matrix = await compatibilityMatrixModel
      .find({ optionCode: code })
      .lean()

    const filteredCodes = matrix.map((code) => code.optionCodeCompat)
    const uniqueCodes = Array.from(new Set(filteredCodes))
    return uniqueCodes.sort()
  } catch (error) {
    logger.error(`Unable to get compatibility matrix`, error)
    throw error
  }
}

export { getCompatibilityMatrix }
