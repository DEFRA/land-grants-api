import { Readable } from 'node:stream'
import { failedBucketPath, getFile } from '../../common/s3/s3.js'
import unzipper from 'unzipper'
import { config } from '../../../config/index.js'
import { createS3Client } from '../../common/plugins/s3-client.js'
import { importData } from '../service/import-land-data.service.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  logInfo,
  logBusinessError
} from '../../common/helpers/logging/log-helpers.js'
import { metricsCounter } from '../../common/helpers/metrics.js'
import { getEntityByName } from '~/src/features/common/constants/entity_types.js'
import { getDBOptions, createDBClient } from '../../common/helpers/postgres.js'
import { createSecureContext } from '../../common/helpers/secure-context/secure-context.js'
import { getEntityNameForIngest } from '../service/start-ingest.service.js'

/**
 * Get resource by type
 * @param {string} entityName - The entity name
 * @returns {object} The resource
 */
const getEntityType = (entityName) => {
  const entityType = getEntityByName(entityName)
  if (!entityType) {
    throw new Error(`Entity type ${entityName} not found`)
  }
  return entityType
}

/**
 * Resolve the entity type for an ingest by looking up its entity in the database
 * @param {string | number} ingestId - The ingest ID
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<object>} The resolved entity type
 */
const getEntityTypeForIngest = async (ingestId, logger) => {
  const dbOptions = getDBOptions()
  const client = createDBClient(dbOptions, {
    secureContext: createSecureContext(logger),
    logger
  })
  await client.connect()

  try {
    const entityName = await getEntityNameForIngest(ingestId, client)
    if (!entityName) {
      throw new Error(`Ingest ${ingestId} not found`)
    }
    return getEntityType(entityName)
  } finally {
    await client.end()
  }
}

/**
 * Import a CSV response body directly into the database.
 * @param {object} response - The S3 response object
 * @param {EntityType} entityType - The table name to import data into
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<boolean>} true if the entity's live table was updated this run
 */
async function handleCsvFile(response, entityType, ingestId, filename, logger) {
  const stream = Readable.fromWeb(response.Body.transformToWebStream())
  return importData(stream, entityType, ingestId, filename, logger)
}

/**
 * Find the first CSV entry in a zip response and import it, keeping the entry
 * stream consumed inside the for-await loop to prevent early iterator return
 * from destroying the underlying zip stream mid-read.
 * @param {object} response - The S3 response object
 * @param {EntityType} entityType - The table name to import data into
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<boolean>} true if the entity's live table was updated this run
 */
async function handleZipFile(response, entityType, ingestId, filename, logger) {
  try {
    const stream = Readable.fromWeb(response.Body.transformToWebStream())
    const zip = stream.pipe(unzipper.Parse({ forceStream: true }))
    for await (const entry of zip) {
      if (entry.path.endsWith('.csv')) {
        return await importData(entry, entityType, ingestId, filename, logger)
      }
      entry.autodrain()
    }
    throw new Error('No CSV found in the ZIP')
  } catch (error) {
    logBusinessError(logger, {
      operation: 'error importing land data',
      error,
      context: {
        entityName: entityType.name,
        ingestId,
        truncateTable: entityType.truncateTable
      }
    })
    throw error
  }
}

/**
 * Imports data from a fetched S3 response based on its content type.
 * @param {object} response - The S3 response object
 * @param {EntityType} entityType - The table name to import data into
 * @param {string | number} ingestId - The ingest ID
 * @param {string | undefined} filename
 * @param {import('../../common/logger.d.js').Logger} logger - The logger
 * @returns {Promise<boolean>} true if the entity's live table was updated this run
 */
function importFromResponse(response, entityType, ingestId, filename, logger) {
  if (response.ContentType === 'application/zip') {
    return handleZipFile(response, entityType, ingestId, filename, logger)
  }
  if (response.ContentType === 'text/csv') {
    return handleCsvFile(response, entityType, ingestId, filename, logger)
  }
  throw new Error(`Invalid content type: ${response.ContentType}`)
}

/**
 * Import land data from S3 bucket
 * @param {{s3key: string, filename?: string, ingestId?: number}} data
 * @returns {Promise<{message: string, dataChanged: boolean}>} The result message and whether an entity's live table was updated
 */
export async function importLandData(data) {
  const { s3key, filename: originalFilename, ingestId: providedIngestId } = data

  const category = 'import-land-data'
  const logger = createLogger()
  const s3Client = createS3Client()
  const bucket = config.get('s3.bucket')
  const [resourceType, ...rest] = s3key.split('/')
  const ingestId = providedIngestId ?? rest?.[0] ?? ''
  const filename = rest.join('/')
  const s3Path = `${resourceType}/${filename}`

  logInfo(logger, {
    category,
    operation: `${resourceType}_import_started`,
    message: `${resourceType} import started`,
    context: {
      ingestId,
      file: s3key,
      resourceType,
      filename,
      s3Path,
      bucket
    }
  })

  try {
    const response = await getFile(s3Client, bucket, s3Path)
    const resource = providedIngestId
      ? await getEntityTypeForIngest(providedIngestId, logger)
      : getEntityType(resourceType)

    const dataChanged = await importFromResponse(
      response,
      resource,
      ingestId,
      originalFilename,
      logger
    )

    logInfo(logger, {
      category,
      operation: `${resourceType}_file_get`,
      message: `${resourceType} file get successfully`,
      context: {
        data: `size: ${response.ContentLength} bytes, type: ${response.ContentType}`
      }
    })

    return {
      message: 'Land data imported successfully',
      dataChanged: Boolean(dataChanged)
    }
  } catch (error) {
    logBusinessError(logger, {
      operation: 'error importing land data',
      error,
      context: {
        category,
        resourceType,
        s3Path,
        failedBucketPath: failedBucketPath(s3Path),
        bucket
      }
    })
    await metricsCounter('land_data_ingest_failed', 1)

    throw error
  }
}

/**
 * @import { EntityType } from '../../common/common.d.js'
 */
