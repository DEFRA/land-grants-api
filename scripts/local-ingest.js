// @ts-nocheck
import fs from 'fs'
import path from 'path'
import { createReadStream } from 'fs'
import { fileURLToPath } from 'url'
import { importData } from '../src/features/land-data-ingest/service/import-land-data.service.js'
import { resources } from '../src/features/land-data-ingest/workers/ingest.module.js'

const logger = {
  info: () => void 0,
  error: () => void 0
}

for (const resource of resources) {
  const folder = path.join('./src/land-data', resource.name)
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const files = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith('.csv'))
    .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]))

  for (let i = 0; i < files.length; i += 10) {
    const batch = files.slice(i, i + 10)
    await Promise.all(
      batch.map((file) => {
        console.log(`Importing ${resource.name} - ${file}`)
        const bodyContents = createReadStream(path.join(folder, file))
        return importData(
          bodyContents,
          resource.name,
          crypto.randomUUID(),
          logger,
          resource.truncateTable
        )
      })
    )
  }
}
