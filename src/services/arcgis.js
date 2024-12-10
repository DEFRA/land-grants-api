import { config } from '~/src/config/index.js'
import { initCache } from '~/src/helpers/cache.js'

/**
 * @type {Record<string, string>}
 */
const baseUrls = {
  landParcel:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/lms_land_parcels/FeatureServer/1',
  intersects:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Parcel_and_SSSI_intersects/FeatureServer/0',
  landCover:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Land_Covers/FeatureServer/0',
  moorland:
    'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Moorland/FeatureServer/0',
  sssi: 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/SSSIs/FeatureServer/0',
  utilities:
    'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer'
}

/**
 * @param {import("@hapi/hapi").Server<any>} server
 * @param {{ resourceName: keyof baseUrls; landParcelId?: string; sheetId?: string, outFields?: "*"; resultCount?: number; }} options
 */
async function fetchFromArcGis(server, options) {
  const {
    resourceName,
    landParcelId,
    sheetId,
    outFields = '*',
    resultCount
  } = options
  const layer = baseUrls[resourceName]

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

export async function fetchIntersection(server, geometry, layerType) {
  const layer = baseUrls[layerType]
  if (!layer) {
    throw new Error('Layer URL not found')
  }

  const url = `${layer}/query`
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
      `Failed to fetch from ${layerType} layer: ${response.statusText}`
    )
  }

  const jsonResponse = await response.json()

  return jsonResponse
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
 * Finds relevant intersections for a given land parcel.
 * @param { import('@hapi/hapi').Server } server
 * @param { string } landParcelId
 * @param { string } sheetId
 * @returns {Promise<{}|null>}
 */
export async function findLandParcelIntersects(server, landParcelId, sheetId) {
  return await fetchFromArcGis(server, {
    resourceName: 'intersects',
    landParcelId,
    sheetId
  })
}

/**
 * Performs utility functions on land parcel data.
 * @param { URLSearchParams } body
 * @param { string } utility
 * @returns {Promise<Response>}
 */
export async function performUtilityFunction(body, utility) {
  return await fetch(`${baseUrls.utilities}/${utility}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
}

const getUserToken = async () => {
  const url = new URL('https://www.arcgis.com/sharing/rest/generateToken')
  const body = new FormData()
  body.append('username', config.get('arcGis.username'))
  body.append('password', config.get('arcGis.password'))
  body.append('referer', '*')
  body.append('f', 'json')

  const response = await fetch(url, { method: 'post', body })
  const json = await response.json()

  return {
    id: 'token',
    access_token: json.token
  }
}

/**
 * @type {import('@hapi/catbox').Policy<any, any>}
 */
let cache

/**
 * ArcGIS token cache
 * @param { import('@hapi/hapi').Server } server
 * @returns {Promise<{ id: string; access_token: string }>}
 */
export function getCachedToken(server) {
  if (!cache) {
    cache = initCache(
      server,
      'arcgis_token',
      async () => {
        return await getUserToken()
      },
      {
        expiresIn: 7200
      }
    )
  }

  return cache.get('arcgis_token')
}

/** @import { LandParcel, Application, LayerId } from '../types.js' */
