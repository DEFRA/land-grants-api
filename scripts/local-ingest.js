// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { fileURLToPath } from 'url'
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

const resources = [
  'parcels',
  'moorland',
  'covers',
  'agreements',
  'compatibility_matrix'
]

for (const resource of resources) {
  const folder = path.join('./src/land-data', resource)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const files = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith('.csv'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

  await Promise.all(
    files.map((file) =>
      importLandData(path.join(folder, file), resource, crypto.randomUUID())
    )
  )
}
