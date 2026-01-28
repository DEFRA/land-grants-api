/**
 * Removes semanticVersion from an item while preserving the version field
 * @param {object} item - The item to transform
 * @returns {object} The transformed item without semanticVersion
 */
function removeSemanticVersion(item) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { semanticVersion, ...rest } = item
  return rest
}

/**
 * Transforms a payment calculation response by removing semanticVersion from items
 * @param {object} response - The payment calculation response object
 * @returns {object} A new response object with semanticVersion removed from parcelItems and agreementLevelItems
 */
export function paymentCalculationTransformerV1(response) {
  const transformedResponse = structuredClone(response)

  // Remove semanticVersion from parcelItems
  for (const [key, parcelItem] of Object.entries(
    transformedResponse.parcelItems
  )) {
    transformedResponse.parcelItems[key] = removeSemanticVersion(parcelItem)
  }

  // Remove semanticVersion from agreementLevelItems
  for (const [key, agreementLevelItem] of Object.entries(
    transformedResponse.agreementLevelItems
  )) {
    transformedResponse.agreementLevelItems[key] =
      removeSemanticVersion(agreementLevelItem)
  }

  return transformedResponse
}
