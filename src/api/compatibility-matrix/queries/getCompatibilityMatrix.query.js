import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'

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
