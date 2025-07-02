import path from 'path'
import { parse } from 'csv-parse/sync' // eslint-disable-line
import { readFileSync } from 'fs'

export function getAvailableAreaFixtures() {
  const fixturePath = path.join(
    __dirname, // eslint-disable-line
    '../fixtures',
    'parcelsAvailableAreaData.csv'
  )
  const content = readFileSync(fixturePath, 'utf-8')
  const fixtures = parse(content, {
    delimiter: ',',
    columns: true
  })
  return fixtures.map((fixture) => [fixture.TestDescription, fixture])
}
