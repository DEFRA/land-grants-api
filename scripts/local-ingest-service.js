import fs, { createReadStream } from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

import { importData } from '../src/features/land-data-ingest/service/import-land-data.service.js'
import { ENTITY_TYPES } from '../src/features/common/constants/entity_types.js'
import { saveIngestStart } from '../src/features/land-data-ingest/service/start-ingest.service.js'
import {
  getDBOptions,
  createDBPool
} from '../src/features/common/helpers/postgres.js'
import { createSecureContext } from '../src/features/common/helpers/secure-context/secure-context.js'

const logger = {
  error: () => console.error,
  warn: () => console.warn,
  info: () => console.info,
  debug: () => console.debug
}

export const ingestLandData = async () => {
  for (const resource of ENTITY_TYPES) {
    // create db connection
    const dbOptions = getDBOptions()
    const connection = createDBPool(dbOptions, {
      secureContext: createSecureContext(logger),
      logger
    })
    const client = await connection.connect()

    const folder = path.join('./src/land-data', resource.name)

    const files = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith('.csv'))
      .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

    let ingestId = crypto.randomUUID()

    if (resource.ingest) {
      const filesWithCount = []
      for (const file of files) {
        const fileContent = fs.readFileSync(path.join(folder, file), 'utf8')
        const data = parse(fileContent, {
          columns: true,
          skip_empty_lines: true
        })
        filesWithCount.push({
          filename: file,
          rows: data.length
        })
      }

      ingestId = await saveIngestStart(
        {
          files: filesWithCount
        },
        resource.name,
        client,
        logger
      )
    }

    client.release()
    await connection.end()

    for (let i = 0; i < files.length; i += 10) {
      const batch = files.slice(i, i + 10)
      await Promise.all(
        batch.map((file) => {
          console.log(`Importing ${resource.name} - ${file}`)
          const bodyContents = createReadStream(path.join(folder, file))
          return importData(bodyContents, resource, ingestId, file, logger)
        })
      )
    }
  }
}
