import archiver from 'archiver'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PassThrough } from 'node:stream'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Create a zip Buffer containing a fixture CSV file
 * @param {string} csvFilename - Name of the CSV fixture file to zip
 * @returns {Promise<Buffer>} A Buffer containing the zipped CSV file
 */
export function createZipFromFixture(csvFilename) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const passThrough = new PassThrough()

    passThrough.on('data', (chunk) => chunks.push(chunk))
    passThrough.on('end', () => resolve(Buffer.concat(chunks)))
    passThrough.on('error', reject)

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', reject)
    archive.pipe(passThrough)

    const fixturePath = path.resolve(__dirname, '../fixtures', csvFilename)
    archive.file(fixturePath, { name: csvFilename })
    archive.finalize()
  })
}
