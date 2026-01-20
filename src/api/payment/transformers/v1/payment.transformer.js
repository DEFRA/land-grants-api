/**
 * Transforms a payment calculation response
 * @param {object} response - The payment calculation response object
 * @returns {object} A new response object
 */
export function paymentCalculationTransformerV1(response) {
  const transformedResponse = structuredClone(response)
  transformedResponse.parcelItems = { ...response.parcelItems }

  for (const key in transformedResponse.parcelItems) {
    const parcelItem = transformedResponse.parcelItems[key]
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { semanticVersion, ...rest } = parcelItem
    transformedResponse.parcelItems[key] = {
      ...rest,
      version: parcelItem.version
    }
  }

  return transformedResponse
}
