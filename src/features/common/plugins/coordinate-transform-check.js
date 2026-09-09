import {
  logInfo,
  logDatabaseError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { metricsCounter } from '~/src/features/common/helpers/metrics.js'
import { checkCoordinateTransform } from '~/src/features/vector-tiles/queries/checkCoordinateTransform.query.js'
import {
  TRANSFORM_CHECK_EASTING,
  TRANSFORM_CHECK_NORTHING,
  TRANSFORM_CHECK_EXPECTED_LNG,
  TRANSFORM_CHECK_EXPECTED_LAT,
  TRANSFORM_CHECK_TOLERANCE_DEGREES
} from '~/src/features/vector-tiles/constants/coordinate-systems.js'

// Asserts at startup that PostGIS converts British National Grid accurately,
// logging an error and emitting a metric if not. It does not stop the server
// starting. Why this can go wrong silently, and where the reference values
// come from, is explained in the vector-tiles coordinate-systems constants.
export const coordinateTransformCheck = {
  plugin: {
    name: 'coordinate-transform-check',
    version: '1.0.0',
    register(server) {
      const verifyCoordinateTransform = async () => {
        const { lng, lat } = await checkCoordinateTransform(
          {
            easting: TRANSFORM_CHECK_EASTING,
            northing: TRANSFORM_CHECK_NORTHING
          },
          server.postgresDb,
          server.logger
        )

        const lngError = Math.abs(lng - TRANSFORM_CHECK_EXPECTED_LNG)
        const latError = Math.abs(lat - TRANSFORM_CHECK_EXPECTED_LAT)
        const accurate =
          lngError <= TRANSFORM_CHECK_TOLERANCE_DEGREES &&
          latError <= TRANSFORM_CHECK_TOLERANCE_DEGREES

        const context = {
          easting: TRANSFORM_CHECK_EASTING,
          northing: TRANSFORM_CHECK_NORTHING,
          expectedLng: TRANSFORM_CHECK_EXPECTED_LNG,
          expectedLat: TRANSFORM_CHECK_EXPECTED_LAT,
          actualLng: lng,
          actualLat: lat,
          lngError,
          latError,
          toleranceDegrees: TRANSFORM_CHECK_TOLERANCE_DEGREES
        }

        if (!accurate) {
          logDatabaseError(server.logger, {
            operation: 'Verify coordinate transform',
            error: new Error(
              'BNG to WGS84 transform is outside tolerance; OSTN15 grid is probably missing and parcel geometry will be around a metre out'
            ),
            context
          })
          await metricsCounter('coordinate_transform_inaccurate', 1)
          return false
        }

        logInfo(server.logger, {
          category: 'database',
          message: 'Coordinate transform verified against OSTN15 reference',
          context
        })
        return true
      }

      server.expose('verifyCoordinateTransform', verifyCoordinateTransform)

      verifyCoordinateTransform().catch((error) => {
        server.logger.error(
          { error },
          'Failed to verify coordinate transform on startup'
        )
      })
    }
  }
}
