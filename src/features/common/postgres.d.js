/**
 * @typedef {object} QueryResult
 * @property {any[]} rows
 */

/**
 * @typedef {object} DbClient
 * @property {() => void} release - Log info messages
 * @property {(query: string, values?: any[] | null) => Promise<QueryResult>} query - Release the client
 */

/**
 * @typedef {object} Pool
 * @property {() => Promise<DbClient>} connect - Connect to the database
 * @property {() => Promise<void>} end - Release the client
 */
