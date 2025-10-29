import fs from 'fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reads a file
 * @param {string} path
 * @returns {Promise<string>} File content
 */
export const readFile = async (path) => {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  return await fs.readFile(join(__dirname, path), 'utf8')
}
