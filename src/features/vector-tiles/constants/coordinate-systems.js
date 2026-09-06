export const BNG_SRID = 27700
export const WGS84_LAT_LONG_SRID = 4326
export const WGS84_WEB_MERCATOR_SRID = 3857

// PostGIS delegates all coordinate maths to PROJ. Given a source and target
// SRID, PROJ enumerates every transformation it knows between the two datums,
// ranks them by published accuracy, and uses the most accurate one whose data
// files are actually present. That last step is silent: when the best option is
// unavailable it drops to the next without erroring. For OSGB36 to WGS84 that
// means OSTN15 where uk_os_OSTN15_NTv2_OSGBtoETRS.tif is installed and a
// Helmert approximation, 1-3m out, where it is not.
//
// Every deployed environment has the grid; the stock postgis/postgis image does
// not. The reference point below lets the service assert at startup that it is
// getting the accurate transformation, rather than discovering months later
// that a container or an Aurora upgrade quietly changed the answer.
//
// Grid reference SD 600 600 - Forest of Bowland, Lancashire. Chosen as a round
// number well inside the OSTN15 coverage area. The expected values were taken
// from QGIS using OSTN15 and confirmed identical on the dev, test and perf-test
// Aurora clusters.
export const TRANSFORM_CHECK_EASTING = 360000
export const TRANSFORM_CHECK_NORTHING = 460000
export const TRANSFORM_CHECK_EXPECTED_LNG = -2.612206659804785
export const TRANSFORM_CHECK_EXPECTED_LAT = 54.03443361534095

// A Helmert fallback puts the point 1.136e-5 degrees out in latitude and
// 7.07e-7 out in longitude, so latitude is the discriminating axis - longitude
// alone would pass. This tolerance is 11x tighter than that latitude error and
// around 1e8 times looser than double-precision noise at these magnitudes, so
// it cannot produce a false positive. 1e-6 degrees is roughly 11cm.
export const TRANSFORM_CHECK_TOLERANCE_DEGREES = 1e-6
