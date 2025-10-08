export const applicationUnitOfMeasurement = 'ha'

export const sqmToHaRounded = (sqm) => {
  const decimalPlaces = 4

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

export const haToSqm = (ha) => {
  if (typeof ha !== 'number' || isNaN(ha)) {
    return 0
  }

  const hectares = ha * 10000
  return hectares
}

export const roundSqm = (sqm) => {
  return Math.round(Number(sqm) || 0)
}
