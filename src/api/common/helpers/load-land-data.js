import fs from 'fs/promises'
import path from 'path'

import { fileURLToPath } from 'url'

async function loadLandData(server, logger) {
  const client = await server.connect()
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const sqlFilePath = path.join(
      __dirname,
      '..',
      '/helpers/seed-data',
      'land-data.sql'
    )
    const sql = await fs.readFile(sqlFilePath, 'utf8')

    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')

    logger.info('Successfully loaded Land data into Postgis')
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error(`Failed to load Land data into Postgis : ${err}`)
  } finally {
    client.release()
  }
}

export { loadLandData }
