import fs from 'fs'
import zlib from 'zlib'

export async function readCompressedFileStream(filePath, encoding = 'utf8') {
  return new Promise((resolve, reject) => {
    const decompressStream = zlib.createGunzip()
    const chunks = []

    fs.createReadStream(filePath)
      .pipe(decompressStream)
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => {
        const decompressedData = Buffer.concat(chunks)
        resolve(decompressedData.toString(encoding))
      })
      .on('error', reject)
  })
}
