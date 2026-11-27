/**
 * The items as a list for a sentence, the last two joined by the conjunction,
 * e.g. "a, b or c".
 * @param {string[]} items - The items to list
 * @param {string} conjunction - The word joining the last two, e.g. "or" or "and"
 * @returns {string} The list
 */
export const listOf = (items, conjunction) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`
