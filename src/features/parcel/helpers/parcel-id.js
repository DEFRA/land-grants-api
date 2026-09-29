/**
 * Split a parcel's composite key into its sheet id and parcel id.
 * @param {string} id - The composite key, `<sheetId>-<parcelId>`
 * @returns {{sheetId: string, parcelId: string}} The sheet id and parcel id
 */
export function splitParcelId(id) {
  const [sheetId, parcelId] = id?.split('-') ?? []

  if (!sheetId || !parcelId) {
    throw new Error(`Unable to split parcel id ${id}`)
  }

  return { sheetId, parcelId }
}
