import { performUtilityFunction } from '~/src/services/arcgis.js'

const arcGisSpatialReferenceId = '4326'

/**
 * Checks if the geometry is valid
 * @param {LandParcelGeometry} geometry
 * @returns { boolean }
 */
const isValidGeometry = (geometry) =>
  geometry && geometry.type === 'Polygon' && geometry.coordinates !== null

/**
 * Transforms the geometry to rings
 * @param {LandParcelGeometry} geometry
 * @returns { * }
 */
const transformGeometryToRings = (geometry) => {
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

/**
 * Uses ArcGIS to calculate if there is intersection between one and many geometries
 * @returns {Promise<Response>}
 */
async function calculateIntersection(
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
async function calculateAreas(intersectedGeometries) {
  const areaRequestBody = new URLSearchParams({
    sr: arcGisSpatialReferenceId,
    polygons: JSON.stringify(intersectedGeometries),
    areaUnit: JSON.stringify({ areaUnit: 'esriSquareMeters' }),
    calculationType: 'preserveShape',
    f: 'json'
  })

  return await performUtilityFunction(areaRequestBody, 'areasAndLengths')
}

export {
  isValidGeometry,
  transformGeometryToRings,
  calculateIntersection,
  calculateAreas
}

/** @import { LandParcelGeometry } from '../../../types.js' */
