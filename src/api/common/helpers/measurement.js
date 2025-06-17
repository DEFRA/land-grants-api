export const applicationUnitOfMeasurement = 'ha'

export const sqmToHaRounded = (sqm) => {
  const decimalPlaces = 8

  if (typeof sqm === 'string') {
    sqm = Number(sqm)
  }

  if (typeof sqm !== 'number' || isNaN(sqm)) {
    return 0
  }

  const hectares = sqm / 10000

  return (
    Math.round(hectares * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}

export const haToSqmRounded = (ha) => {
  const decimalPlaces = 4

  if (typeof ha !== 'number' || isNaN(ha)) {
    return 0
  }

  const hectares = ha * 10000
  return Math.round(hectares * Math.pow(10, decimalPlaces))
}
