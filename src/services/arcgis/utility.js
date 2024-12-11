import { arcGisSpatialReferenceId } from './arcgis.js'

const utilityBaseUrl =
  'https://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer'

/**
 * Performs utility functions on land parcel data.
 * @param { URLSearchParams } body
 * @param { string } utility
 * @returns {Promise<Response>}
 */
export async function performUtilityFunction(body, utility) {
  return await fetch(`${utilityBaseUrl}/${utility}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })
}

/**
 * Uses ArcGIS to calculate if there is intersection between one and many geometries
 * @returns {Promise<Response>}
 */
export async function calculateIntersection(
  arcGisFormatParcelGeometry,
  moorlandGeometries
) {
  const intersectRequestBody = new URLSearchParams({
    sr: arcGisSpatialReferenceId,
    geometry: JSON.stringify({
      geometryType: 'esriGeometryPolygon',
      geometry: arcGisFormatParcelGeometry
    }),
    geometries: JSON.stringify({
      geometryType: 'esriGeometryPolygon',
      geometries: moorlandGeometries
    }),
    f: 'json'
  })

  return await performUtilityFunction(intersectRequestBody, 'intersect')
}

/**
 * Uses ArcGIS to calculate the area of intersection between geometries
 * @returns {Promise<Response>}
 */
export async function calculateAreas(intersectedGeometries) {
  const areaRequestBody = new URLSearchParams({
    sr: arcGisSpatialReferenceId,
    polygons: JSON.stringify(intersectedGeometries),
    areaUnit: JSON.stringify({ areaUnit: 'esriSquareMeters' }),
    calculationType: 'preserveShape',
    f: 'json'
  })

  return await performUtilityFunction(areaRequestBody, 'areasAndLengths')
}
