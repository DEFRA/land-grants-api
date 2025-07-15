import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'

/**
 * Retrieves the compatibility matrix from the database.
 * @param {object} logger - The logger object for logging errors.
 * @param {string[] | null} codes - Optional array of option codes to filter the matrix.
 * @returns {Promise<Array>} - A promise that resolves to an array of compatibility matrix entries.
 */
async function getCompatibilityMatrix(logger, codes = null) {
  const whereClause = { optionCode: { $in: codes } }
  try {
    const matrix = await compatibilityMatrixModel
      .find(codes === null ? {} : whereClause)
      .select('-_id optionCode optionCodeCompat year')
      .sort({ optionCodeCompat: 1 })
      .lean()

    return matrix
  } catch (error) {
    logger.error(`Unable to get compatibility matrix`, error)
    throw error
  }
}

export { getCompatibilityMatrix }
