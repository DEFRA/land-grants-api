/**
 * Creates a compatibility check function based on a compatibility map
 * @param {{[key: string]: string[]}} compatibilityMap - Map where keys are action codes and values are arrays of compatible action codes
 * @returns {Function} Function that takes two action codes and returns true if they are compatible
 */
export function makeCompatibilityCheckFn(compatibilityMap) {
  return (action1, action2) => {
    return (
      compatibilityMap[action1]?.includes(action2) ||
      compatibilityMap[action2]?.includes(action1)
    )
  }
}
