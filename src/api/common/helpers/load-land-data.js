import path from 'path'
import { readCompressedFileStream } from './compression.js'

import { fileURLToPath } from 'url'

async function loadPostgresData(dataFileName, server, logger) {
  const client = await server.connect()
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const sqlFilePath = path.join(
      __dirname,
      '..',
      '../common/migration',
      dataFileName
    )
    const sql = await readCompressedFileStream(sqlFilePath)

    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')

    logger.info(
      `Successfully loaded postgres data ${dataFileName} into Postgis`
    )
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error(
      `Failed to load postgres data file:  ${dataFileName} into Postgis : ${err}`
    )
  } finally {
    client.release()
  }
}

export { loadPostgresData }
