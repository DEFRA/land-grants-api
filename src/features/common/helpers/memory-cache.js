import { Client } from '@hapi/catbox'
import { Engine } from '@hapi/catbox-memory'

/**
 * @typedef {object} MemoryCacheOptions
 * @property {string} partition - Catbox partition name used to isolate cached items.
 * @property {string} segment - Cache segment name.
 * @property {string} id - Cache item id within the segment.
 * @property {number} ttlMs - Time-to-live in milliseconds.
 * @property {boolean} [includeLastUpdated] - Whether to add a lastUpdated ISO timestamp when setting values.
 */

/**
 * @typedef {object} MemoryCache
 * @property {{ segment: string, id: string }} key
 * @property {number} ttlMs
 * @property {function(): Promise<Client<unknown>>} start
 * @property {function(): Promise<void>} stop
 * @property {function(): Promise<unknown | null>} get
 * @property {function(unknown): Promise<unknown>} set
 * @property {function(function(): Promise<unknown | undefined>): Promise<unknown | undefined>} refresh
 */

/**
 * Create an in-memory cache backed by @hapi/catbox-memory.
 * @param {MemoryCacheOptions} options
 * @returns {MemoryCache}
 */
function createMemoryCache({
  partition,
  segment,
  id,
  ttlMs,
  includeLastUpdated = true
}) {
  const key = { segment, id }
  /** @type {Client<unknown> | null} */
  let client = null

  async function start() {
    if (client) {
      return client
    }

    client = new Client(Engine, { partition })
    await client.start()
    return client
  }

  async function stop() {
    if (client) {
      await client.stop()
      client = null
    }
  }

  async function get() {
    if (!client) {
      return null
    }

    const cached = await client.get(key)
    return cached?.item ?? null
  }

  async function set(value) {
    const item =
      includeLastUpdated && value && typeof value === 'object'
        ? { ...value, lastUpdated: new Date().toISOString() }
        : value

    if (client) {
      await client.set(key, item, ttlMs)
    }

    return item
  }

  async function refresh(refreshFn) {
    const value = await refreshFn()

    if (value !== undefined) {
      return set(value)
    }

    return undefined
  }

  return {
    key,
    ttlMs,
    start,
    stop,
    get,
    set,
    refresh
  }
}

export { createMemoryCache }
