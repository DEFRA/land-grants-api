import path from 'path'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync' // eslint-disable-line

export function getCsvFixtures(filename) {
  const fixturePath = path.join(
    __dirname, // eslint-disable-line
    '../fixtures',
    filename
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })
  return fixtures
}
