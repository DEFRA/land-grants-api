import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const _dirname = path.dirname(fileURLToPath(import.meta.url));

export function getCsvFixtures(filename) {
  const fixturePath = path.join(_dirname, '../fixtures', filename);
  const content = readFileSync(fixturePath, 'utf-8');
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  });
  return fixtures;
}
