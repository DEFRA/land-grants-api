import Boom from '@hapi/boom'

/**
 * Enrich land actions data
 * @returns {object} The land action data with available area
 * @param {object} landParcelData - The parcel to fetch
 * @param {object} logger - Logger instance
 */
function enrichLandActionsData(landParcelData, logger) {
  if (!landParcelData) {
    throw Boom.badRequest('landParcelData is required')
  }

  try {
    return {
      parcel: {
        parcelId: landParcelData.parcelId,
        sheetId: landParcelData.sheetId,
        size: {
          unit: 'ha',
          value: getParcelArea(landParcelData)
        },
        actions: [
          {
            code: 'CSAM1',
            description:
              'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
            availableArea: {
              unit: 'ha',
              value: calculateActionsApplicableArea()
            }
          }
        ]
      }
    }
  } catch (error) {
    logger.error(`Error fetching calculating land actions availability area`, {
      error: error.message,
      stack: error.stack
    })

    if (error.isBoom) {
      throw error
    }

    throw Boom.internal('Failed to fetch Land Parcel data')
  }
}

/**
 * Enrich land actions data
 * @returns {number} The land action data with available area
 * @param {object} landParcelData - The parcel to fetch
 */
function calculateActionsApplicableArea() {
  return 200
}

/**
 * Get land parcel area
 * @returns {number} The land action data with available area
 * @param {object} landParcelData - The parcel to fetch
 */
function getParcelArea(landParcelData) {
  if (landParcelData.parcelId === '9238') {
    return 440
  }

  return 500
}

export { enrichLandActionsData }
