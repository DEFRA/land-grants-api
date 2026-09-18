/**
 * @typedef {object} BoundaryIntersection
 * @property {number} intersectingLengthMeters
 * @property {number} boundaryLengthMeters
 */

/**
 * Keyed by the layerName that action config rules refer to. A layer is null
 * when its query failed.
 * @typedef {object} BoundaryIntersections
 * @property {BoundaryIntersection|null} sssi
 * @property {BoundaryIntersection|null} historic_features
 */
