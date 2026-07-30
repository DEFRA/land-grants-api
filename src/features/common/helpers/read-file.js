import fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reads a file
 * @param {string} path
 * @returns {Promise<string>} File content
 */
export const readFile = async (path) => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return fs.readFile(
    join(currentDir, '../../land-data-ingest/sql', path),
    'utf8'
  );
};
