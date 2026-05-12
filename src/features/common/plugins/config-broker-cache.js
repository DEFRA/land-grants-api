import { config } from '~/src/config/index.js'
import { getAllFiles, getFile } from '../s3/s3.js'

/**
 * @import { ConfigBrokerCache, ConfigBrokerCacheEntry } from '~/src/features/common/cache.d.js'
 */

/**
 * Read an S3 response body stream as UTF-8 and parse JSON.
 * @param {AsyncIterable<Buffer|string|Uint8Array>|Iterable<Buffer|string|Uint8Array>} body - S3 object response body (async iterable of chunks)
 * @returns {Promise<ConfigBrokerCacheEntry>} Parsed config document, or null when empty/whitespace-only or invalid JSON
 */
async function parseJsonBodyFromStream(body) {
  const chunks = []
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  try {
    const raw = Buffer.concat(chunks).toString('utf-8')
    return JSON.parse(raw.trim())
  } catch {
    return null
  }
}

/**
 * Load and cache all config-broker files.
 * @param {import('@aws-sdk/client-s3').S3Client} s3Client - S3 client
 * @returns {Promise<ConfigBrokerCache>} Parsed entries in S3 list order
 */
async function createConfigBrokerCache(s3Client) {
  const bucket = config.get('s3.configBrokerBucket')
  const files = await getAllFiles(s3Client, bucket)
  /** @type {ConfigBrokerCache} */
  const cache = []

  for (const file of files) {
    const key = file.Key

    if (!key) {
      continue
    }

    const fileResponse = await getFile(s3Client, bucket, key)
    const parsed = await parseJsonBodyFromStream(fileResponse.Body)
    cache.push(parsed)
  }

  return cache
}

const configBrokerCache = {
  plugin: {
    name: 'configBrokerCache',
    version: '0.1.0',
    async register(server) {
      const s3Client = server.s3
      /** @type {ConfigBrokerCache} */
      const configBrokerCache = await createConfigBrokerCache(s3Client)
      server.app.configBrokerCache = configBrokerCache
      server.logger.info(
        `Config cache loaded: ${configBrokerCache.length} file(s)`
      )
    }
  }
}

export { configBrokerCache, createConfigBrokerCache }
