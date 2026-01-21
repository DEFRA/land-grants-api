/**
 * Transforms semanticVersion to version in an item
 * @param {object} item - The item to transform
 * @returns {object} The transformed item with version instead of semanticVersion
 */
function transformSemanticVersionToVersion(item) {
  const { semanticVersion, ...rest } = item
  return {
    ...rest,
    version: semanticVersion
  }
}

/**
 * Transforms a payment calculation response by converting semanticVersion to version
 * @param {object} response - The payment calculation response object
 * @returns {object} A new response object with semanticVersion converted to version in parcelItems and agreementLevelItems
 */
export function paymentCalculationTransformerV2(response) {
  const transformedResponse = structuredClone(response)

  // Transform semanticVersion to version in parcelItems
  for (const [key, parcelItem] of Object.entries(
    transformedResponse.parcelItems
  )) {
    transformedResponse.parcelItems[key] =
      transformSemanticVersionToVersion(parcelItem)
  }

  // Transform semanticVersion to version in agreementLevelItems
  for (const [key, agreementLevelItem] of Object.entries(
    transformedResponse.agreementLevelItems
  )) {
    transformedResponse.agreementLevelItems[key] =
      transformSemanticVersionToVersion(agreementLevelItem)
  }

  return transformedResponse
}
