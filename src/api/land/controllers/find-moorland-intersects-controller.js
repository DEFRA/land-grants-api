import Boom from '@hapi/boom'
import {
  isValidGeometry,
  transformGeometryToRings,
  calculateIntersection,
  calculateAreas
} from '../helpers/find-moorland-intersects.js'
import {
  findLandParcel,
  fetchMoorlandIntersection
} from '~/src/services/arcgis.js'

async function calculateIntersectionArea(server, landParcelId, sheetId) {
  const landParcelResponse = await findLandParcel(server, landParcelId, sheetId)

  if (
    !landParcelResponse?.features ||
    landParcelResponse.features.length === 0
  ) {
    return { parcelId: landParcelId, totalArea: 0, availableArea: 0 }
  }

  const parcelFeature = landParcelResponse.features[0] // at the moment we are only using the first feature of the parcel for POC
  const rawParcelGeometry = parcelFeature?.geometry
  const parcelArea = parcelFeature?.properties?.GEOM_AREA_SQM

  if (!isValidGeometry(rawParcelGeometry) || !parcelArea) {
    return Boom.badRequest('Invalid geometry or area in land parcel response.')
  }

  const parcelGeometry = transformGeometryToRings(rawParcelGeometry)
  const moorlandIntersections = await fetchMoorlandIntersection(
    server,
    parcelGeometry
  )

  if (
    !moorlandIntersections?.features ||
    moorlandIntersections.features.length === 0
  ) {
    return { parcelId: landParcelId, totalArea: 0, availableArea: parcelArea }
  }

  const moorlandGeometries = moorlandIntersections.features.map((feature) =>
    transformGeometryToRings(feature.geometry)
  )
  const intersectResponse = await calculateIntersection(
    parcelGeometry,
    moorlandGeometries
  )

  if (!intersectResponse?.ok) {
    return Boom.badRequest(
      `Failed to fetch intersection: ${intersectResponse.statusText}`
    )
  }

  const intersectResult = await intersectResponse.json()
  const intersectedGeometries = intersectResult.geometries || []

  if (intersectedGeometries.length === 0) {
    return { parcelId: landParcelId, totalArea: 0, availableArea: parcelArea }
  }
  const areaResponse = await calculateAreas(intersectedGeometries)

  if (!areaResponse.ok) {
    return Boom.badRequest(
      `Failed to calculate areas: ${areaResponse.statusText}`
    )
  }

  const areaResult = await areaResponse.json()

  // may have error margin due to maximum number of vertices per geometry of public API i.e.snapping
  const totalArea = (areaResult.areas || []).reduce(
    (sum, area) => sum + area,
    0
  )
  const availableArea = parcelArea - totalArea // available area is the difference between the total area of the parcel and the area of the moorland intersection

  return {
    parcelId: landParcelId,
    totalArea,
    availableArea
  }
}

/**
 *
 * @satisfies {Partial<ServerRoute>}
 */
const findMoorlandIntersectsController = {
  /**
   * @param { import('@hapi/hapi').Request & MongoDBPlugin } request
   * @param { import('@hapi/hapi').ResponseToolkit } h
   * @returns {Promise<*>}
   */
  handler: async (request, h) => {
    const entity = await calculateIntersectionArea(
      request.server,
      request.query.landParcelId,
      request.query.sheetId
    )

    if (Boom.isBoom(entity)) return entity

    return h.response({ message: 'success', entity }).code(200)
  }
}

export { findMoorlandIntersectsController }

/**
 * @import { ServerRoute} from '@hapi/hapi'
 * @import { MongoDBPlugin } from '~/src/helpers/mongodb.js'
 */
