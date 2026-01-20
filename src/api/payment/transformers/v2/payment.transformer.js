/**
 * Transforms a payment calculation response
 * @param {object} response - The payment calculation response object
 * @returns {object} A new response object
 */
export function paymentCalculationTransformerV2(response) {
  const transformedResponse = structuredClone(response)
  transformedResponse.parcelItems = { ...response.parcelItems }

  // Restrict what this loop acts on by testing each property.
  for (const key in transformedResponse.parcelItems) {
    if (Object.hasOwn(transformedResponse.parcelItems, key)) {
      const parcelItem = transformedResponse.parcelItems[key]
      const { semanticVersion, ...rest } = parcelItem
      transformedResponse.parcelItems[key] = {
        ...rest,
        version: semanticVersion
      }
    }
  }

  return transformedResponse
}
