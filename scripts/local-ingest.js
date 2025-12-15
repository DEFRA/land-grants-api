// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { config } from '../src/config/index.js'
import {
  importLandCovers,
  importLandParcels,
  importMoorlandDesignations,
  importCompatibilityMatrix,
  importAgreements
} from '../src/api/land-data-ingest/service/import-land-data.service.js'
import { createLogger } from '../src/api/common/helpers/logging/logger.js'

export async function importLandData(file, resourceType, ingestId) {
  try {
    const logger = {
      info: (message) => void 0,
      error: (message) => void 0,
      warn: (message) => void 0,
      debug: (message) => void 0
    }

    const bodyContents = createReadStream(file)

    switch (resourceType) {
      case 'parcels':
        await importLandParcels(bodyContents, ingestId, logger)
        break
      case 'covers':
        await importLandCovers(bodyContents, ingestId, logger)
        break
      case 'moorland':
        await importMoorlandDesignations(bodyContents, ingestId, logger)
        break
      case 'compatibility_matrix':
        await importCompatibilityMatrix(bodyContents, ingestId, logger)
        break
      case 'agreements':
        await importAgreements(bodyContents, ingestId, logger)
        break
      default:
        throw new Error(`Invalid resource type: ${resourceType}`)
    }

    return 'Land data imported successfully'
  } catch (error) {
    throw error
  }
}

const resource =
  'parcels' | 'moorland' | 'covers' | 'agreements' | 'compatibility_matrix'
const folder = path.join('./ingestion-data/data', resource)
const files = fs
  .readdirSync(folder)
  .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

for (const file of files) {
  console.log(`Importing ${file}`)
  await importLandData(path.join(folder, file), resource, crypto.randomUUID())
}
