import { getCachedToken } from './user-token.js'
import {
  findLandParcel,
  layerUrls,
  transformGeometryToRings,
  isValidGeometry
} from './arcgis.js'

import { calculateAreas, calculateIntersection } from './utility.js'

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

export async function fetchFromLayerByIntersection(layerId, server, geometry) {
  const layerUrl = layerUrls[layerId]

  if (!layerUrl) {
    throw new Error(`${layerId} layer URL not found`)
  }

  const url = `${layerUrl}/query`
  const tokenResponse = await getCachedToken(server)
  const queryGeometry = {
    rings: geometry.rings
  }

  const body = new URLSearchParams({
    geometry: JSON.stringify(queryGeometry),
    geometryType: 'esriGeometryPolygon',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    f: 'geojson',
    token: tokenResponse.access_token
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch from ${layerId} layer: ${response.statusText}`
    )
  }

  return await response.json()
}

/**
 *
 * @param {Server} server
 * @param {string} landParcelId
 * @param {string} sheetId
 * @param {LayerId} layerId
 * @returns { Promise<{ parcelId: string, totalIntersectArea: number, nonIntersectingArea: number }> }
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
    return { parcelId: landParcelId, totalArea: 0, availableArea: 0 }
  }

  const parcelFeature = landParcelResponse.features[0] // at the moment we are only using the first feature of the parcel for POC
  const rawParcelGeometry = parcelFeature?.geometry
  const parcelArea = parcelFeature?.properties?.GEOM_AREA_SQM

  if (!isValidGeometry(rawParcelGeometry) || !parcelArea) {
    throw Error('Invalid geometry or area in land parcel response.')
  }

  const parcelGeometry = transformGeometryToRings(rawParcelGeometry)
  const moorlandIntersections = await fetchFromLayerByIntersection(
    layerId,
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
    throw Error(`Failed to fetch intersection: ${intersectResponse.statusText}`)
  }

  const intersectResult = await intersectResponse.json()
  const intersectedGeometries = intersectResult.geometries || []

  if (intersectedGeometries.length === 0) {
    return { parcelId: landParcelId, totalArea: 0, availableArea: parcelArea }
  }
  const areaResponse = await calculateAreas(intersectedGeometries)

  if (!areaResponse.ok) {
    throw Error(`Failed to calculate areas: ${areaResponse.statusText}`)
  }

  const areaResult = await areaResponse.json()

  // may have error margin due to maximum number of vertices per geometry of public API i.e.snapping
  const totalIntersectArea = (areaResult.areas || []).reduce(
    (sum, area) => sum + area,
    0
  )
  const nonIntersectingArea = parcelArea - totalIntersectArea // available area is the difference between the total area of the parcel and the area of the moorland intersection

  return {
    parcelId: landParcelId,
    totalIntersectArea,
    nonIntersectingArea
  }
}

/**
 * import {LayerId} from '~/src/rules-engine/rulesEngine.d.js'
 * import { Server } from '@hapi/hapi'
 */
