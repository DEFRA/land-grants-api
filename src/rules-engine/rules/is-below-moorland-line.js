export function check(application) {
  if (application?.landParcel?.moorlandLineStatus !== 'below') {
    return { passed: false, message: 'Land parcel is above the moorland line' }
  }

  return {
    passed: true,
    message: ''
  }
}

/**
 * @type {import('../../types.js').Rule}
 */
export const isBelowMoorlandLine = { check, requiredDataLayers: ['moorland'] }
