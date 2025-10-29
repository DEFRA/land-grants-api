import fs from 'fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reads a file
 * @param {string} path
 * @returns {Promise<string>} File content
 */
export const readFile = async (path) => {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  return await fs.readFile(join(__dirname, path), 'utf8')
}
