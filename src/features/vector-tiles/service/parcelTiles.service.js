/**
 * Split each "{sheetId}-{parcelId}" string into two parallel arrays
 * suitable for unnest($1::text[], $2::text[]) in Postgres.
 * @param {string[]} ids
 * @returns {{ sheetIds: string[], parcelKeys: string[] }}
 */
export function parseParcelIds(ids) {
  const sheetIds = []
  const parcelKeys = []
  for (const id of ids) {
    const dash = id.indexOf('-')
    sheetIds.push(id.slice(0, dash))
    parcelKeys.push(id.slice(dash + 1))
  }
  return { sheetIds, parcelKeys }
}
