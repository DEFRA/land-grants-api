export const applicationUnitOfMeasurement = 'ha'

export const sqmToHaRounded = (sqm) => {
  if (typeof sqm !== 'number' || isNaN(sqm)) {
    return 0
  }

  const decimalPlaces = 4
  const hectares = sqm / 10000

  return (
    Math.round(hectares * Math.pow(10, decimalPlaces)) /
    Math.pow(10, decimalPlaces)
  )
}
