export const applicationUnitOfMeasurement = 'ha'

export const sqmToHaRounded = (sqm) => {
  if (typeof sqm !== 'number' || isNaN(sqm)) {
    return (0).toFixed(2)
  }

  const decimalPlaces = 4
  const hectares = sqm / 10000

  return (
    Math.round(hectares * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}

export const haToSqmRounded = (ha) => {
  if (typeof ha !== 'number' || isNaN(ha)) {
    return (0).toFixed(2)
  }

  const decimalPlaces = 4
  const hectares = ha * 10000
  return Math.round(hectares * Math.pow(10, decimalPlaces))
}
