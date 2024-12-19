import { getCachedToken } from './user-token.js'

export const arcGisSpatialReferenceId = '4326'

/**
 * @type {Record<LayerId, string>}
 */
export const layerUrls = {
  landParcel:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/lms_land_parcels/FeatureServer/1',
  landCover:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Land_Covers/FeatureServer/0',
  moorland:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Moorland/FeatureServer/0',
  sssi: 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/SSSIs/FeatureServer/0'
}

/**
 * @param {import("@hapi/hapi").Server<any>} server
 * @param {{ resourceName: LayerId; landParcelId?: string; sheetId?: string, outFields?: "*"; resultCount?: number; }} options
 */
async function fetchFromArcGis(server, options) {
  const {
    resourceName,
    landParcelId,
    sheetId,
    outFields = '*',
    resultCount
  } = options
  const layer = layerUrls[resourceName]

  if (!layer) {
    throw new Error('Invalid layer id')
  }

  const url = new URL(`${layer}/query`)

  const tokenResponse = await getCachedToken(server)
  url.searchParams.set('token', tokenResponse.access_token)
  url.searchParams.set('f', 'geojson')
  url.searchParams.set('outFields', outFields)

  if (resultCount) {
    url.searchParams.set('resultRecordCount', `${resultCount}`)
  }

  if (landParcelId && sheetId) {
    if (landParcelId.includes(',') || sheetId.includes(',')) {
      url.searchParams.set(
        'where',
        `parcel_id IN ('${landParcelId.replace(/,/g, "','")}') AND sheet_id IN ('${sheetId.replace(/,/g, "','")}')`
      )
    } else {
      url.searchParams.set(
        'where',
        `parcel_id='${landParcelId}' AND sheet_id='${sheetId}'`
      )
    }
  }

  const response = await fetch(url)
  return await response.json()
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
 * @typedef ArcGISLandResponse
 * @property {Array} features
 */

/**
 * Finds and returns a single land parcel from ArcGIS.
 * @param { import('@hapi/hapi').Server } server
 * @param { string } landParcelId
 * @param { string } sheetId
 * @returns {Promise<ArcGISLandResponse|null>}
 */
export async function findLandParcel(server, landParcelId, sheetId) {
  return await fetchFromArcGis(server, {
    resourceName: 'landParcel',
    landParcelId,
    sheetId
  })
}

/**
 * Finds and returns a single land parcel from ArcGIS.
 * @param { import('@hapi/hapi').Server } server
 * @param { string } landParcelId
 * @param { string } sheetId
 * @returns {Promise<ArcGISLandResponse|null>}
 */
export async function findLandCover(server, landParcelId, sheetId) {
  return await fetchFromArcGis(server, {
    resourceName: 'landCover',
    landParcelId,
    sheetId
  })
}

/**
 * Checks if the geometry is valid
 * @param {LandParcelGeometry} geometry
 * @returns { boolean }
 */
export const isValidGeometry = (geometry) =>
  geometry && geometry.type === 'Polygon' && geometry.coordinates !== null

/**
 * Transforms the geometry to rings
 * @param {LandParcelGeometry} geometry
 * @returns { * }
 */
export const transformGeometryToRings = (geometry) => {
  if (!isValidGeometry(geometry)) {
    throw new Error('Invalid input geometry')
  }
  return {
    rings: geometry.coordinates.map((ring) => {
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        return [...ring, ring[0]] // Ensure the ring is closed
      }
      return ring
    })
  }
}

/** @import { LandParcel, Application, LayerId } from '../../rules-engine/rulesEngine.d.js' */
