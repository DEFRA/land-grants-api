import Boom from '@hapi/boom'

import {
  calculateAreas,
  calculateIntersection,
  findLandParcel,
  isValidGeometry,
  transformGeometryToRings,
  fetchFromLayerByIntersection
} from '~/src/services/arcgis/index.js'

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const findIntersectsController = {
  /**
   * @param { import('@hapi/hapi').Request } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    try {
      const entity = await calculateIntersectionArea(
        request.server,
        request.query.landParcelId,
        request.query.sheetId,
        request.params.type
      )
      return h.response({ message: 'success', entity }).code(200)
    } catch (err) {
      return Boom.boomify(err)
    }
  }
}

export async function fetchIntersections(
  server,
  intersectionNames,
  landParcelId,
  sheetId
) {
  const parcel = await findLandParcel(server, landParcelId, sheetId)

  if (!parcel) {
    throw new Error(`Land parcel ${sheetId} ${landParcelId} not found`)
  }

  const intersections = await Promise.all(
    intersectionNames.map(async (layerId) => {
      const response = await fetchFromLayerByIntersection(
        layerId,
        server,
        parcel.geometry
      )
      return {
        layerId,
        response
      }
    })
  )

  return intersections.reduce(
    (acc, { layerId, response }) => ({ ...acc, [layerId]: response }),
    {}
  )
}

/**
 *
 * @param {Server} server
 * @param {string} landParcelId
 * @param {string} sheetId
 * @param {LayerId} layerId
 * @returns { Promise<{ parcelId: string, totalIntersectArea: number, nonIntersectingArea: number, intersectingAreaPercentage }> }
 */
export async function calculateIntersectionArea(
  server,
  landParcelId,
  sheetId,
  layerId
) {
  const landParcelResponse = await findLandParcel(server, landParcelId, sheetId)

  if (
    !landParcelResponse?.features ||
    landParcelResponse.features.length === 0
  ) {
    return {
      layerId,
      parcelId: landParcelId,
      totalIntersectingArea: 0,
      nonIntersectingArea: 0,
      intersectingAreaPercentage: 0
    }
  }

  const parcelFeature = landParcelResponse.features[0] // at the moment we are only using the first feature of the parcel for POC
  const rawParcelGeometry = parcelFeature?.geometry
  const parcelArea = parcelFeature?.properties?.GEOM_AREA_SQM

  if (!isValidGeometry(rawParcelGeometry) || !parcelArea) {
    throw Error('Invalid geometry or area in land parcel response.')
  }

  const parcelGeometry = transformGeometryToRings(rawParcelGeometry)
  const intersections = await fetchFromLayerByIntersection(
    layerId,
    server,
    parcelGeometry
  )

  if (!intersections?.features || intersections.features.length === 0) {
    return {
      layerId,
      parcelId: landParcelId,
      totalIntersectingArea: 0,
      nonIntersectingArea: parcelArea,
      intersectingAreaPercentage: 0
    }
  }

  const geometries = intersections.features.map((feature) =>
    transformGeometryToRings(feature.geometry)
  )
  const intersectResponse = await calculateIntersection(
    parcelGeometry,
    geometries
  )

  if (!intersectResponse?.ok) {
    throw Error(`Failed to fetch intersection: ${intersectResponse.statusText}`)
  }

  const intersectResult = await intersectResponse.json()
  const intersectedGeometries = intersectResult.geometries || []

  if (intersectedGeometries.length === 0) {
    return {
      parcelId: landParcelId,
      totalIntersectingArea: 0,
      nonIntersectingArea: parcelArea,
      intersectingAreaPercentage: 0
    }
  }
  const areaResponse = await calculateAreas(intersectedGeometries)

  if (!areaResponse.ok) {
    throw Error(`Failed to calculate areas: ${areaResponse.statusText}`)
  }

  const areaResult = await areaResponse.json()

  // may have error margin due to maximum number of vertices per geometry of public API i.e.snapping
  const totalIntersectingArea = (areaResult.areas || []).reduce(
    (sum, area) => sum + area,
    0
  )
  const nonIntersectingArea = parcelArea - totalIntersectingArea
  const intersectingAreaPercentage = (totalIntersectingArea / parcelArea) * 100

  return {
    parcelId: landParcelId,
    totalIntersectingArea,
    nonIntersectingArea,
    intersectingAreaPercentage
  }
}

export { findIntersectsController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 */
