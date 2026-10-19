/**
 * @typedef {object} QueryResult
 * @property {any[]} rows
 * @property {number | null} [rowCount] - Rows inserted, updated or deleted by the query
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
