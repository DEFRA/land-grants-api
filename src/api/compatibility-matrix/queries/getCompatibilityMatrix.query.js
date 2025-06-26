import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'

async function getCompatibilityMatrix(codes, logger) {
  try {
    const matrix = await compatibilityMatrixModel
      .find({ optionCode: { $in: codes } })
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
