/**
 * The codes as a list for a sentence, the last two joined by "or" or "and".
 * @param {string[]} codes - The codes
 * @param {'or' | 'and'} conjunction - The word joining the last two
 * @returns {string} The list
 */
export const listOf = (codes, conjunction) =>
  codes.length <= 1
    ? (codes[0] ?? '')
    : `${codes.slice(0, -1).join(', ')} ${conjunction} ${codes.at(-1)}`
