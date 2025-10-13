/**
 * @typedef {object} DbClient
 * @property {function(): void} release - Log info messages
 * @property {function(query: string, values: any[]): void} query - Release the client
 */

/**
 * @typedef {object} Pool
 * @property {function(): void} connect - Connect to the database
 * @property {function(): void} end - Release the client
 */
